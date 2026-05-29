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
    .setName("alerta-roja")
    .setDescription("🚨 Activar ALERTA ROJA en el servidor")
    .addStringOption((opt) =>
      opt.setName("zona").setDescription("Zona afectada").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("duracion").setDescription("Duración estimada (ej: 30 minutos)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("nivel").setDescription("Nivel de amenaza").setRequired(false)
      .addChoices(
        { name: "⚠️ Alto", value: "ALTO" },
        { name: "🔴 Crítico", value: "CRÍTICO" },
        { name: "☢️ Extremo", value: "EXTREMO" }
      )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const zona = interaction.options.getString("zona") || "Toda la ciudad";
    const duracion = interaction.options.getString("duracion") || "Indefinido";
    const nivel = interaction.options.getString("nivel") || "CRÍTICO";
    const ahora = new Date();
    const ts = Math.floor(ahora.getTime() / 1000);

    const alertaId = `alerta_roja_${Date.now()}`;
    const unidadesEnCamino = [];
    const unidadesActivas = [];

    const alertas = db.loadDB("votaciones");
    alertas[alertaId] = {
      tipo: "roja",
      zona,
      duracion,
      nivel,
      admin: interaction.user.tag,
      adminId: interaction.user.id,
      inicio: ahora.toISOString(),
      activa: true,
      unidadesEnCamino: [],
      unidadesActivas: [],
    };
    db.saveDB("votaciones", alertas);

    const embed = buildEmbedRojo(interaction.user, zona, duracion, nivel, ts, [], []);

    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`roja_camino_${alertaId}`)
        .setLabel("🚓 En Camino")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`roja_activo_${alertaId}`)
        .setLabel("🛡️ Unidades Activas")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`roja_finalizar_${alertaId}`)
        .setLabel("❌ Finalizar Alerta")
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [botones], fetchReply: true });

    try {
      await interaction.followUp({
        content: `@everyone 🚨 **¡ALERTA ROJA ACTIVADA!** Zona: **${zona}** | Nivel: **${nivel}** | Todas las unidades al máximo estado de alerta.`,
      });
    } catch {}

    log("ALERTA", "Alerta Roja activada", interaction.user.tag, `Zona: ${zona} | Nivel: ${nivel}`);

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 3 * 60 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      const datos = db.loadDB("votaciones")[alertaId];
      if (!datos) return;

      if (i.customId === `roja_finalizar_${alertaId}`) {
        if (i.user.id !== interaction.user.id && !i.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return i.reply({ content: "❌ Solo administradores pueden finalizar la alerta.", ephemeral: true });
        }
        datos.activa = false;
        const todas = db.loadDB("votaciones");
        todas[alertaId] = datos;
        db.saveDB("votaciones", todas);
        collector.stop("finalizada");

        const embedFin = new EmbedBuilder()
          .setColor(COLORS.verde)
          .setTitle("✅ ALERTA ROJA FINALIZADA")
          .setDescription(
            `**┌──────────────────────────────────────────────────┐**\n` +
            `**│  ✅  SITUACIÓN CONTROLADA — CIUDAD NORMALIZADA   │**\n` +
            `**└──────────────────────────────────────────────────┘**\n\n` +
            `> *Las autoridades han controlado la situación y la ciudad vuelve a operar con normalidad.*\n` +
            `> *Gracias a todas las unidades que respondieron al llamado.*`
          )
          .addFields(
            { name: "👑 Finalizó", value: `<@${i.user.id}>`, inline: true },
            { name: "🕐 Hora Cierre", value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true },
            { name: "🏙️ Zona", value: zona, inline: true },
            { name: "🚓 Unidades En Camino", value: `${datos.unidadesEnCamino?.length || 0} unidades`, inline: true },
            { name: "🛡️ Unidades Activas", value: `${datos.unidadesActivas?.length || 0} unidades`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: "🏙️ Sistema de Alertas RP Premium" });

        const btnDesactivados = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("fin1").setLabel("🚓 En Camino").setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("fin2").setLabel("🛡️ Unidades Activas").setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId("fin3").setLabel("✅ Finalizada").setStyle(ButtonStyle.Success).setDisabled(true)
        );

        await msg.edit({ embeds: [embedFin], components: [btnDesactivados] });
        await i.reply({ content: "✅ Alerta roja finalizada.", ephemeral: true });
        log("ALERTA", "Alerta Roja finalizada", i.user.tag, `Zona: ${zona}`);
        return;
      }

      if (i.customId === `roja_camino_${alertaId}`) {
        const todas = db.loadDB("votaciones");
        if (!todas[alertaId].unidadesEnCamino.includes(i.user.id)) {
          todas[alertaId].unidadesEnCamino.push(i.user.id);
          db.saveDB("votaciones", todas);
          await i.reply({ content: `🚓 **${i.user.username}** está en camino a la zona de alerta.`, ephemeral: true });
        } else {
          await i.reply({ content: "⚠️ Ya estás marcado como **En Camino**.", ephemeral: true });
        }
        const actualizado = db.loadDB("votaciones")[alertaId];
        await msg.edit({ embeds: [buildEmbedRojo(interaction.user, zona, duracion, nivel, ts, actualizado.unidadesEnCamino, actualizado.unidadesActivas)], components: [botones] });
      }

      if (i.customId === `roja_activo_${alertaId}`) {
        const todas = db.loadDB("votaciones");
        if (!todas[alertaId].unidadesActivas.includes(i.user.id)) {
          todas[alertaId].unidadesActivas.push(i.user.id);
          db.saveDB("votaciones", todas);
          await i.reply({ content: `🛡️ **${i.user.username}** marcado como Unidad Activa en la zona.`, ephemeral: true });
        } else {
          await i.reply({ content: "⚠️ Ya estás marcado como **Unidad Activa**.", ephemeral: true });
        }
        const actualizado = db.loadDB("votaciones")[alertaId];
        await msg.edit({ embeds: [buildEmbedRojo(interaction.user, zona, duracion, nivel, ts, actualizado.unidadesEnCamino, actualizado.unidadesActivas)], components: [botones] });
      }
    });
  },
};

function buildEmbedRojo(user, zona, duracion, nivel, ts, enCamino, activas) {
  const nivelEmoji = { ALTO: "⚠️", CRÍTICO: "🔴", EXTREMO: "☢️" }[nivel] || "🔴";
  const nivelColor = { ALTO: 0xff6b35, CRÍTICO: 0xff0000, EXTREMO: 0x8b0000 }[nivel] || 0xff0000;

  return new EmbedBuilder()
    .setColor(nivelColor)
    .setTitle("🚨 ━━ ALERTA ROJA ACTIVADA ━━ 🚨")
    .setDescription(
      `**┌────────────────────────────────────────────────────────┐**\n` +
      `**│  🚨  ESTADO DE EMERGENCIA — MÁXIMA ALERTA ACTIVA  🚨  │**\n` +
      `**└────────────────────────────────────────────────────────┘**\n\n` +
      `> *Las autoridades han declarado **ALERTA ROJA** en toda la ciudad.*\n\n` +
      `> *Se solicita máxima atención y cooperación de todos los ciudadanos y cuerpos de emergencia.*\n\n` +
      `> *Todas las unidades disponibles deben mantenerse activas y preparadas para responder inmediatamente ante cualquier situación crítica.*`
    )
    .addFields(
      { name: "👑 Autoridad Activante", value: `<@${user.id}>`, inline: true },
      { name: "🕐 Hora de Activación", value: `<t:${ts}:T>`, inline: true },
      { name: "📅 Fecha", value: `<t:${ts}:D>`, inline: true },
      { name: `${nivelEmoji} Nivel de Amenaza`, value: `\`\`\`diff\n- ${nivel}\n\`\`\``, inline: true },
      { name: "🆘 Estado Emergencia", value: "```diff\n- ACTIVA — MÁXIMA ALERTA\n```", inline: true },
      { name: "⏳ Duración Estimada", value: `**${duracion}**`, inline: true },
      { name: "📍 Zona Afectada", value: `> 🗺️ **${zona}**` },
      {
        name: "📊 Estado Unidades",
        value:
          `🚓 **En Camino:** ${enCamino.length} unidad${enCamino.length !== 1 ? "es" : ""}\n` +
          `🛡️ **Activas:** ${activas.length} unidad${activas.length !== 1 ? "es" : ""}`,
        inline: false,
      },
      {
        name: "📻 Canal de Emergencias",
        value: "> ⚡ *Todas las unidades sintonizadas en frecuencia de emergencia*",
      }
    )
    .setThumbnail("https://cdn.discordapp.com/emojis/placeholder.gif")
    .setTimestamp()
    .setFooter({ text: "🏙️ Sistema de Alertas RP Premium • ALERTA ROJA ACTIVA" });
}
