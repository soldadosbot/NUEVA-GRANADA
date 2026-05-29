const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ComponentType,
} = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");
const { COLORS } = require("../../functions/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("votacion")
    .setDescription("🗳️ Iniciar una votación para abrir el servidor")
    .addIntegerOption((opt) =>
      opt
        .setName("duracion")
        .setDescription("Duración en minutos (default: 10)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(60)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const duracion = interaction.options.getInteger("duracion") || 10;
    const ahora = new Date();
    const fin = new Date(ahora.getTime() + duracion * 60 * 1000);

    const votId = `vot_${Date.now()}`;
    const datosVot = {
      id: votId,
      creador: interaction.user.id,
      creadorTag: interaction.user.tag,
      inicio: ahora.toISOString(),
      fin: fin.toISOString(),
      votos: { si: [], no: [] },
      activa: true,
      resultado: null,
    };
    db.set("votaciones", votId, datosVot);

    const embed = buildVotacionEmbed(datosVot, interaction.user, duracion);
    const botones = buildBotones(votId);

    const msg = await interaction.reply({
      embeds: [embed],
      components: [botones],
      fetchReply: true,
    });

    log("VOTACION", "Votación iniciada", interaction.user.tag, `ID: ${votId} | Duración: ${duracion}min`);

    // Auto-cierre
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: duracion * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      const vot = db.get("votaciones", votId);
      if (!vot || !vot.activa) {
        return i.reply({ content: "⚠️ Esta votación ya ha finalizado.", ephemeral: true });
      }

      const yaVoto = vot.votos.si.includes(i.user.id) || vot.votos.no.includes(i.user.id);
      if (yaVoto) {
        return i.reply({ content: "❌ **Ya has emitido tu voto.** Solo se permite un voto por persona.", ephemeral: true });
      }

      if (i.customId === `vot_si_${votId}`) {
        vot.votos.si.push(i.user.id);
        await i.reply({ content: "✅ **Voto registrado:** Has votado a favor de **Abrir el Servidor**.", ephemeral: true });
      } else if (i.customId === `vot_no_${votId}`) {
        vot.votos.no.push(i.user.id);
        await i.reply({ content: "❌ **Voto registrado:** Has votado por **Mantener Cerrado** el servidor.", ephemeral: true });
      }

      db.set("votaciones", votId, vot);
      const totalSi = vot.votos.si.length;
      const totalNo = vot.votos.no.length;
      const total = totalSi + totalNo;
      const pctSi = total > 0 ? Math.round((totalSi / total) * 100) : 0;
      const pctNo = total > 0 ? Math.round((totalNo / total) * 100) : 0;

      const embedActualizado = buildVotacionEmbed(vot, interaction.user, duracion, totalSi, totalNo, pctSi, pctNo);
      await msg.edit({ embeds: [embedActualizado], components: [botones] });
    });

    collector.on("end", async () => {
      const vot = db.get("votaciones", votId);
      if (!vot || !vot.activa) return;

      vot.activa = false;
      const si = vot.votos.si.length;
      const no = vot.votos.no.length;
      const total = si + no;
      const ganaApertura = si > no;
      vot.resultado = ganaApertura ? "apertura" : "cerrado";
      db.set("votaciones", votId, vot);

      const pctSi = total > 0 ? Math.round((si / total) * 100) : 0;
      const pctNo = total > 0 ? Math.round((no / total) * 100) : 0;

      const embedResultado = new EmbedBuilder()
        .setColor(ganaApertura ? COLORS.verde : COLORS.rojo)
        .setTitle(ganaApertura ? "✅ VOTACIÓN FINALIZADA — APERTURA APROBADA" : "❌ VOTACIÓN FINALIZADA — SERVIDOR PERMANECE CERRADO")
        .setDescription(
          ganaApertura
            ? "```diff\n+ La comunidad aprobó la apertura del servidor.\n+ ¡El servidor abrirá sus puertas!```"
            : "```diff\n- La comunidad decidió mantener el servidor cerrado.\n- El servidor permanecerá fuera de línea.```"
        )
        .addFields(
          { name: "✅ Votos a Favor", value: `**${si}** votos (${pctSi}%)`, inline: true },
          { name: "❌ Votos en Contra", value: `**${no}** votos (${pctNo}%)`, inline: true },
          { name: "📊 Total Participantes", value: `**${total}** votantes`, inline: true },
          {
            name: "📋 Resultado Final",
            value: ganaApertura
              ? "🟢 **APERTURA APROBADA** por la comunidad"
              : "🔴 **SERVIDOR CERRADO** por decisión comunitaria",
          }
        )
        .setTimestamp()
        .setFooter({ text: "🏙️ Sistema de Votaciones RP Premium" });

      const btnsDesactivados = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("vot_terminada_si")
          .setLabel(`✅ Abrir Servidor (${si})`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("vot_terminada_no")
          .setLabel(`❌ Mantener Cerrado (${no})`)
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );

      await msg.edit({ embeds: [embedResultado], components: [btnsDesactivados] });
      log("VOTACION", "Votación finalizada", "Sistema", `Resultado: ${vot.resultado} | Si:${si} No:${no}`);
    });
  },
};

function buildVotacionEmbed(vot, user, duracion, si = 0, no = 0, pctSi = 0, pctNo = 0) {
  const ahora = new Date();
  const fin = new Date(vot.fin);
  const msRestantes = fin - ahora;
  const minRestantes = Math.max(0, Math.floor(msRestantes / 60000));
  const segRestantes = Math.max(0, Math.floor((msRestantes % 60000) / 1000));
  const total = si + no;

  const barSi = Math.round((si / Math.max(total, 1)) * 20);
  const barNo = 20 - barSi;
  const barraSi = "█".repeat(barSi) + "░".repeat(barNo);
  const barraNO = "░".repeat(barSi) + "█".repeat(barNo);

  return new EmbedBuilder()
    .setColor(COLORS.dorado)
    .setTitle("🗳️ VOTACIÓN PARA ABRIR SERVIDOR")
    .setDescription(
      `> *El servidor está preparado para abrir sus puertas.*\n> *La comunidad puede votar para decidir si se realiza la apertura oficial.*\n\n` +
      `**┌─────────────────────────────────────────┐**\n` +
      `**│         🏙️ SISTEMA RP PREMIUM          │**\n` +
      `**└─────────────────────────────────────────┘**`
    )
    .addFields(
      { name: "👑 Administrador", value: `<@${user.id}>`, inline: true },
      { name: "🕐 Hora Inicio", value: `<t:${Math.floor(new Date(vot.inicio).getTime() / 1000)}:T>`, inline: true },
      { name: "📅 Fecha", value: `<t:${Math.floor(new Date(vot.inicio).getTime() / 1000)}:D>`, inline: true },
      { name: "⏳ Tiempo Restante", value: `**${minRestantes}m ${segRestantes}s**`, inline: true },
      { name: "🔵 Estado", value: vot.activa ? "🟢 **ACTIVA**" : "🔴 **FINALIZADA**", inline: true },
      { name: "👥 Total Votos", value: `**${total}**`, inline: true },
      {
        name: "📊 Resultados en Tiempo Real",
        value:
          `✅ Abrir: \`${barraSi}\` **${si}** (${pctSi}%)\n` +
          `❌ Cerrar: \`${barraNO}\` **${no}** (${pctNo}%)`,
      }
    )
    .setImage("https://i.imgur.com/placeholder-banner.gif")
    .setTimestamp()
    .setFooter({ text: `🏙️ Sistema RP Premium • Votación ID: ${vot.id}` });
}

function buildBotones(votId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vot_si_${votId}`)
      .setLabel("✅ Abrir Servidor")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`vot_no_${votId}`)
      .setLabel("❌ Mantener Cerrado")
      .setStyle(ButtonStyle.Danger)
  );
}
