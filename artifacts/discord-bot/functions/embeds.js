const { EmbedBuilder } = require("discord.js");

const COLORS = {
  premium: 0x2b2d31,
  verde: 0x00d26a,
  rojo: 0xff4757,
  azul: 0x5865f2,
  dorado: 0xffd700,
  gris: 0x36393f,
  cyan: 0x00b4d8,
  naranja: 0xff6b35,
};

function embedBase(color = COLORS.premium) {
  return new EmbedBuilder()
    .setColor(color)
    .setTimestamp()
    .setFooter({
      text: "🏙️ Sistema RP Premium • Desarrollado con ❤️",
      iconURL:
        "https://cdn.discordapp.com/emojis/1234567890.gif",
    });
}

function embedError(titulo, descripcion) {
  return embedBase(COLORS.rojo)
    .setTitle(`❌ ${titulo}`)
    .setDescription(`\`\`\`diff\n- ${descripcion}\`\`\``);
}

function embedExito(titulo, descripcion) {
  return embedBase(COLORS.verde)
    .setTitle(`✅ ${titulo}`)
    .setDescription(descripcion);
}

function embedInfo(titulo, descripcion) {
  return embedBase(COLORS.azul)
    .setTitle(`ℹ️ ${titulo}`)
    .setDescription(descripcion);
}

function embedAdmin(titulo, descripcion) {
  return embedBase(COLORS.dorado)
    .setTitle(`👑 ${titulo}`)
    .setDescription(descripcion);
}

module.exports = { embedBase, embedError, embedExito, embedInfo, embedAdmin, COLORS };
