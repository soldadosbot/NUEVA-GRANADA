const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");
const { COLORS } = require("../../functions/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cerrar-servidor")
    .setDescription("🔴 Cerrar el servidor oficialmente")
    .addStringOption((opt) =>
      opt.setName("motivo").setDescription("Motivo del cierre").setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName("tiempo").setDescription("Tiempo estimado de reapertura (en horas)").setRequired(false).setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const motivo = interaction.options.getString("motivo") || "Mantenimiento del servidor";
    const tiempoHoras = interaction.options.getInteger("tiempo") || null;
    const ahora = new Date();

    const servidor = db.loadDB("servidor");
    servidor.estado = "cerrado";
    servidor.ultimoCierre = ahora.toISOString();
    servidor.motivoCierre = motivo;
    servidor.adminCierre = interaction.user.tag;
    db.saveDB("servidor", servidor);

    const ts = Math.floor(ahora.getTime() / 1000);
    const reaperturaStr = tiempoHoras
      ? `<t:${Math.floor((ahora.getTime() + tiempoHoras * 3600000) / 1000)}:R>`
      : "Sin hora definida";

    const embed = new EmbedBuilder()
      .setColor(COLORS.rojo)
      .setTitle("🔴 ━━ SERVIDOR CERRADO ━━ 🔴")
      .setDescription(
        `**┌──────────────────────────────────────────────┐**\n` +
        `**│  🏙️  EL SERVIDOR ESTÁ TEMPORALMENTE CERRADO │**\n` +
        `**└──────────────────────────────────────────────┘**\n\n` +
        `> *El servidor ha cerrado sus puertas temporalmente.*\n` +
        `> *Gracias por tu participación. ¡Nos vemos pronto!*`
      )
      .addFields(
        { name: "🔴 Estado", value: "```diff\n- OFFLINE — CERRADO\n```", inline: true },
        { name: "👑 Administrador", value: `<@${interaction.user.id}>`, inline: true },
        { name: "🕐 Hora de Cierre", value: `<t:${ts}:T>`, inline: true },
        { name: "📋 Motivo del Cierre", value: `> *${motivo}*` },
        { name: "⏳ Reapertura Estimada", value: reaperturaStr, inline: true },
        { name: "📅 Fecha", value: `<t:${ts}:D>`, inline: true },
        {
          name: "ℹ️ Información",
          value: "Permanece atento a los anuncios del servidor para saber cuándo volvemos a abrir.",
        }
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
      .setTimestamp()
      .setFooter({ text: "🏙️ Sistema RP Premium • Cierre Oficial" });

    await interaction.reply({ embeds: [embed] });

    try {
      await interaction.followUp({ content: `@everyone 🔴 **El servidor ha CERRADO.** Motivo: *${motivo}*` });
    } catch {}

    log("SERVIDOR", "Servidor cerrado", interaction.user.tag, `Motivo: ${motivo} | Tiempo: ${tiempoHoras}h`);
  },
};
