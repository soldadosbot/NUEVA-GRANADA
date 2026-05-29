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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("alerta-amarilla")
    .setDescription("⚠️ Activar ALERTA AMARILLA preventiva")
    .addStringOption((opt) =>
      opt.setName("motivo").setDescription("Motivo de la alerta").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("zona").setDescription("Zona afectada").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("nivel_riesgo").setDescription("Nivel de riesgo").setRequired(false)
      .addChoices(
        { name: "🟡 Moderado", value: "MODERADO" },
        { name: "🟠 Elevado", value: "ELEVADO" },
        { name: "🔶 Alto", value: "ALTO" }
      )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const motivo = interaction.options.getString("motivo") || "Situación preventiva bajo monitoreo";
    const zona = interaction.options.getString("zona") || "Sector norte de la ciudad";
    const nivelRiesgo = interaction.options.getString("nivel_riesgo") || "ELEVADO";
    const ahora = new Date();
    const ts = Math.floor(ahora.getTime() / 1000);

    const alertaId = `alerta_amarilla_${Date.now()}`;
    const AMARILLO = 0xffd700;

    const embed = buildEmbedAmarillo(interaction.user, motivo, zona, nivelRiesgo, ts, [], []);

    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`amarilla_supervisar_${alertaId}`)
        .setLabel("👀 Supervisar Zona")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`amarilla_patrullar_${alertaId}`)
        .setLabel("🚓 Patrullar")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`amarilla_finalizar_${alertaId}`)
        .setLabel("❌ Finalizar")
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [botones], fetchReply: true });

    try {
      await interaction.followUp({
        content: `@here ⚠️ **ALERTA AMARILLA ACTIVADA** en **${zona}** — *${motivo}* | Nivel: **${nivelRiesgo}**`,
      });
    } catch {}

    log("ALERTA", "Alerta Amarilla activada", interaction.user.tag, `Zona: ${zona} | Motivo: ${motivo}`);

    const supervisores = [];
    const patrullas = [];

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 3 * 60 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === `amarilla_finalizar_${alertaId}`) {
        if (i.user.id !== interaction.user.id && !i.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return i.reply({ content: "❌ Solo administradores pueden finalizar.", ephemeral: true });
        }
        collector.stop("finalizada");

        const embedFin = new EmbedBuilder()
          .setColor(0x00d26a)
          .setTitle("✅ ALERTA AMARILLA FINALIZADA")
          .setDescription(
            `**┌──────────────────────────────────────────────┐**\n` +
            `**│  ✅  SITUACIÓN ESTABILIZADA — BAJO CONTROL   │**\n` +
            `**└──────────────────────────────────────────────┘**\n\n` +
            `> *La situación ha sido estabilizada y continúa bajo control.*\n` +
            `> *Se levanta la alerta preventiva. Las autoridades permanecen vigilantes.*`
          )
          .addFields(
            { name: "👑 Finalizó", value: `<@${i.user.id}>`, inline: true },
            { name: "🕐 Hora Cierre", value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true },
            { name: "📍 Zona", value: zona, inline: true },
            { name: "👀 Supervisores", value: `${supervisores.length}`, inline: true },
            { name: "🚓 Patrullas", value: `${patrullas.length}`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: "🏙️ Sistema de Alertas RP Premium" });

        const btnsOff = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("a1").setLabel("👀 Supervisar").setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("a2").setLabel("🚓 Patrullar").setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId("a3").setLabel("✅ Finalizada").setStyle(ButtonStyle.Success).setDisabled(true)
        );

        await msg.edit({ embeds: [embedFin], components: [btnsOff] });
        await i.reply({ content: "✅ Alerta amarilla finalizada.", ephemeral: true });
        log("ALERTA", "Alerta Amarilla finalizada", i.user.tag, `Zona: ${zona}`);
        return;
      }

      if (i.customId === `amarilla_supervisar_${alertaId}`) {
        if (!supervisores.includes(i.user.id)) supervisores.push(i.user.id);
        await i.reply({ content: `👀 **${i.user.username}** está supervisando la zona **${zona}**.`, ephemeral: true });
        await msg.edit({ embeds: [buildEmbedAmarillo(interaction.user, motivo, zona, nivelRiesgo, ts, supervisores, patrullas)], components: [botones] });
      }

      if (i.customId === `amarilla_patrullar_${alertaId}`) {
        if (!patrullas.includes(i.user.id)) patrullas.push(i.user.id);
        await i.reply({ content: `🚓 **${i.user.username}** está patrullando en **${zona}**.`, ephemeral: true });
        await msg.edit({ embeds: [buildEmbedAmarillo(interaction.user, motivo, zona, nivelRiesgo, ts, supervisores, patrullas)], components: [botones] });
      }
    });
  },
};

function buildEmbedAmarillo(user, motivo, zona, nivelRiesgo, ts, supervisores, patrullas) {
  const nivelEmoji = { MODERADO: "🟡", ELEVADO: "🟠", ALTO: "🔶" }[nivelRiesgo] || "🟡";

  return new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle("⚠️ ━━ ALERTA AMARILLA ACTIVADA ━━ ⚠️")
    .setDescription(
      `**┌────────────────────────────────────────────────────────┐**\n` +
      `**│  ⚠️  ESTADO PREVENTIVO — MONITOREO ACTIVO EN CURSO  ⚠️ │**\n` +
      `**└────────────────────────────────────────────────────────┘**\n\n` +
      `> *Las autoridades han emitido una **ALERTA AMARILLA** preventiva.*\n\n` +
      `> *Se recomienda mantener precaución y permanecer atentos a cualquier actualización oficial.*\n\n` +
      `> *Las unidades de seguridad continúan monitoreando la situación activamente.*`
    )
    .addFields(
      { name: "👑 Administrador", value: `<@${user.id}>`, inline: true },
      { name: "🕐 Hora Activación", value: `<t:${ts}:T>`, inline: true },
      { name: "📅 Fecha", value: `<t:${ts}:D>`, inline: true },
      { name: "📋 Motivo", value: `> ⚡ *${motivo}*` },
      { name: `${nivelEmoji} Nivel de Riesgo`, value: `\`\`\`fix\n${nivelRiesgo}\n\`\`\``, inline: true },
      { name: "📡 Estado Monitoreo", value: "```fix\n🟡 ACTIVO — EN OBSERVACIÓN\n```", inline: true },
      { name: "📍 Zona Afectada", value: `> 🗺️ **${zona}**` },
      {
        name: "📊 Unidades Desplegadas",
        value: `👀 **Supervisores:** ${supervisores.length}\n🚓 **Patrullas:** ${patrullas.length}`,
        inline: false,
      }
    )
    .setTimestamp()
    .setFooter({ text: "🏙️ Sistema de Alertas RP Premium • ALERTA AMARILLA ACTIVA" });
}
