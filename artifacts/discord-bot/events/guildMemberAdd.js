const { EmbedBuilder } = require("discord.js");
const { COLORS } = require("../functions/embeds");
const { log } = require("../functions/logger");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    log("MIEMBRO", "Nuevo miembro", member.user.tag, `ID: ${member.id}`);

    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.dorado)
            .setTitle("🏙️ ¡BIENVENIDO AL SERVIDOR RP PREMIUM!")
            .setDescription(
              `¡Hola **${member.user.username}**! Bienvenido a la experiencia RP más premium.\n\n` +
              `**Para comenzar, usa estos comandos:**\n\n` +
              `🪪 \`/registrar-cedula\` — Obtén tu identidad oficial\n` +
              `🚗 \`/registro-vehiculos\` — Registra tu vehículo\n` +
              `🚘 \`/registro-conduccion\` — Obtén tu licencia\n` +
              `🏦 \`/banco\` — Consulta tu cuenta bancaria\n` +
              `👤 \`/perfil\` — Ve tu perfil completo\n\n` +
              `> *Empieza con **$500** en efectivo y **$1,000** en tu banco.*`
            )
            .setThumbnail(member.guild.iconURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: "🏙️ Servidor RP Premium — ¡Bienvenido!" }),
        ],
      });
    } catch {}
  },
};
