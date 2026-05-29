const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ComponentType,
} = require("discord.js");
const { log } = require("../../functions/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("alerta-verde")
    .setDescription("✅ Activar ALERTA VERDE — Ciudad en normalidad")
    .addStringOption((opt) =>
      opt.setName("zona").setDescription("Área reportada").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("servicios").setDescription("Servicios activos (ej: Policía, Bomberos, EMS)").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const zona = interaction.options.getString("zona") || "Toda la ciudad";
    const servicios = interaction.options.getString("servicios") || "Policía • EMS • Bomberos • Gobierno";
    const ahora = new Date();
    const ts = Math.floor(ahora.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x00d26a)
      .setTitle("✅ ━━ ALERTA VERDE ACTIVADA ━━ ✅")
      .setDescription(
        `**┌────────────────────────────────────────────────────────┐**\n` +
        `**│  ✅  CIUDAD OPERANDO CON NORMALIDAD — SIN ALERTAS   ✅  │**\n` +
        `**└────────────────────────────────────────────────────────┘**\n\n` +
        `> *Las autoridades informan que la ciudad se encuentra operando con normalidad.*\n\n` +
        `> *Todos los servicios y actividades continúan activos sin riesgos reportados.*\n\n` +
        `> *Los ciudadanos pueden continuar con sus actividades cotidianas con total tranquilidad.*`
      )
      .addFields(
        { name: "👑 Administrador", value: `<@${interaction.user.id}>`, inline: true },
        { name: "🕐 Hora Emisión", value: `<t:${ts}:T>`, inline: true },
        { name: "📅 Fecha", value: `<t:${ts}:D>`, inline: true },
        { name: "📍 Área", value: `> 🗺️ **${zona}**` },
        { name: "🟢 Estado Ciudad", value: "```diff\n+ NORMAL — SIN ALERTAS ACTIVAS\n```", inline: true },
        { name: "🛡️ Nivel Seguridad", value: "```diff\n+ MÁXIMO — TOTAL CONTROL\n```", inline: true },
        {
          name: "🔧 Servicios Activos",
          value: servicios.split("•").map((s) => `> ✅ **${s.trim()}**`).join("\n"),
        },
        {
          name: "📢 Comunicado Oficial",
          value:
            "> *Las autoridades continúan supervisando la seguridad de todos los ciudadanos.*\n" +
            "> *Ante cualquier incidente, comuníquese con los servicios de emergencia.*",
        }
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
      .setTimestamp()
      .setFooter({ text: "🏙️ Sistema de Alertas RP Premium • ALERTA VERDE" });

    const confirmar = [];
    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verde_confirmar")
        .setLabel("🟢 Confirmar Estado")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("verde_reportes")
        .setLabel("📡 Ver Reportes")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("verde_cerrar")
        .setLabel("❌ Cerrar Aviso")
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [botones], fetchReply: true });
    log("ALERTA", "Alerta Verde activada", interaction.user.tag, `Zona: ${zona}`);

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "verde_confirmar") {
        if (!confirmar.includes(i.user.id)) confirmar.push(i.user.id);
        await i.reply({ content: `✅ **${i.user.username}** ha confirmado el estado de normalidad.`, ephemeral: true });

        const embedActualizado = EmbedBuilder.from(embed)
          .spliceFields(embed.data.fields.length - 1, 1, {
            name: `✅ Confirmaciones (${confirmar.length})`,
            value: confirmar.slice(-5).map((id) => `> <@${id}>`).join("\n"),
          });
        await msg.edit({ embeds: [embedActualizado], components: [botones] });
      }

      if (i.customId === "verde_reportes") {
        await i.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("📡 REPORTES ACTIVOS")
              .setDescription(
                `> **Estado actual de la ciudad:**\n\n` +
                `🟢 Zona Norte — Sin incidentes\n` +
                `🟢 Zona Sur — Bajo control\n` +
                `🟢 Zona Este — Patrullaje activo\n` +
                `🟢 Zona Oeste — Sin novedades\n` +
                `🟢 Centro — Monitoreo continuo`
              )
              .setTimestamp()
              .setFooter({ text: "🏙️ Sistema RP Premium" }),
          ],
          ephemeral: true,
        });
      }

      if (i.customId === "verde_cerrar") {
        if (i.user.id !== interaction.user.id && !i.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return i.reply({ content: "❌ Solo el administrador puede cerrar este aviso.", ephemeral: true });
        }
        collector.stop("cerrado");

        const embedFin = new EmbedBuilder()
          .setColor(0x00d26a)
          .setTitle("✅ COMUNICADO CERRADO")
          .setDescription(
            `> *La ciudad opera con **total normalidad**.*\n\n` +
            `> *Las autoridades continúan supervisando la seguridad de todos los ciudadanos.*`
          )
          .addFields(
            { name: "✅ Confirmaciones", value: `**${confirmar.length}** unidades confirmaron el estado`, inline: true },
            { name: "🕐 Cerrado", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: "🏙️ Sistema de Alertas RP Premium" });

        const btnsOff = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("v1").setLabel("🟢 Confirmado").setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId("v2").setLabel("📡 Reportes").setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("v3").setLabel("✅ Cerrado").setStyle(ButtonStyle.Secondary).setDisabled(true)
        );

        await msg.edit({ embeds: [embedFin], components: [btnsOff] });
        await i.reply({ content: "✅ Aviso cerrado.", ephemeral: true });
        log("ALERTA", "Alerta Verde cerrada", i.user.tag, `Zona: ${zona}`);
      }
    });
  },
};
