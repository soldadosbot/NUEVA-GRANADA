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
    .setName("abrir-servidor")
    .setDescription("🟢 Abrir el servidor oficialmente")
    .addIntegerOption((opt) =>
      opt.setName("jugadores").setDescription("Número de jugadores permitidos").setRequired(false).setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const jugadores = interaction.options.getInteger("jugadores") || 64;
    const ahora = new Date();

    const servidor = db.loadDB("servidor");
    servidor.estado = "abierto";
    servidor.ultimaApertura = ahora.toISOString();
    servidor.jugadores = jugadores;
    servidor.adminApertura = interaction.user.tag;
    db.saveDB("servidor", servidor);

    const ts = Math.floor(ahora.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(COLORS.verde)
      .setTitle("🟢 ━━ SERVIDOR ABIERTO ━━ 🟢")
      .setDescription(
        `**┌──────────────────────────────────────────────┐**\n` +
        `**│  🏙️  EL SERVIDOR ESTÁ OFICIALMENTE ABIERTO  │**\n` +
        `**└──────────────────────────────────────────────┘**\n\n` +
        `> 🎉 *¡Bienvenidos a una nueva jornada en el servidor!*\n` +
        `> *El roleplay comienza ahora. Conéctate y disfruta.*`
      )
      .addFields(
        { name: "🏙️ Servidor", value: "**RP Premium Server**", inline: true },
        { name: "🟢 Estado", value: "```diff\n+ ONLINE — ABIERTO\n```", inline: true },
        { name: "👥 Capacidad", value: `**${jugadores}** jugadores`, inline: true },
        { name: "👑 Administrador", value: `<@${interaction.user.id}>`, inline: true },
        { name: "🕐 Hora de Apertura", value: `<t:${ts}:T>`, inline: true },
        { name: "📅 Fecha", value: `<t:${ts}:D>`, inline: true },
        {
          name: "📋 Instrucciones",
          value:
            "1️⃣ Únete al servidor de juego\n2️⃣ Sigue las reglas del roleplay\n3️⃣ ¡Disfruta la experiencia!",
        }
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
      .setImage("https://i.imgur.com/placeholder-open.gif")
      .setTimestamp()
      .setFooter({ text: "🏙️ Sistema RP Premium • Apertura Oficial" });

    const boton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🎮 Entrar al Servidor")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/placeholder"),
      new ButtonBuilder()
        .setLabel("📋 Ver Reglas")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("ver_reglas_apertura")
    );

    await interaction.reply({ embeds: [embed], components: [boton] });

    // Ping @everyone si hay permisos
    try {
      await interaction.followUp({ content: "@everyone 🟢 **¡El servidor está ABIERTO!** ¡Conéctate ahora!" });
    } catch {}

    log("SERVIDOR", "Servidor abierto", interaction.user.tag, `Jugadores: ${jugadores}`);
  },
};
