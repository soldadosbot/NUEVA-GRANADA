const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../database/db");
const { COLORS } = require("../../functions/embeds");

function getCuenta(userId) {
  let cuenta = db.get("banco", userId);
  if (!cuenta) {
    cuenta = { userId, efectivo: 500, banco: 1000, historial: [] };
    db.set("banco", userId, cuenta);
  }
  return cuenta;
}

function formatMoney(n) {
  return `$${Number(n).toLocaleString("es-ES")}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("banco")
    .setDescription("🏦 Ver el estado de tu cuenta bancaria RP"),

  async execute(interaction) {
    const cuenta = getCuenta(interaction.user.id);
    const total = cuenta.efectivo + cuenta.banco;

    const ultimosMovimientos = (cuenta.historial || []).slice(-5).reverse();

    const embed = new EmbedBuilder()
      .setColor(COLORS.dorado)
      .setTitle("🏦 BANCO NACIONAL RP — ESTADO DE CUENTA")
      .setDescription(
        `**┌─────────────────────────────────────┐**\n` +
        `**│  💳 CUENTA BANCARIA OFICIAL RP       │**\n` +
        `**└─────────────────────────────────────┘**\n\n` +
        `> Bienvenido, **${interaction.user.username}**. Aquí tienes el resumen de tu cuenta.`
      )
      .addFields(
        { name: "💵 Efectivo (Bolsillo)", value: `\`\`\`${formatMoney(cuenta.efectivo)}\`\`\``, inline: true },
        { name: "🏦 Cuenta Bancaria", value: `\`\`\`${formatMoney(cuenta.banco)}\`\`\``, inline: true },
        { name: "💰 Total Patrimonio", value: `\`\`\`${formatMoney(total)}\`\`\``, inline: true },
        {
          name: "📋 Últimos Movimientos",
          value:
            ultimosMovimientos.length > 0
              ? ultimosMovimientos
                  .map((m) => `${m.tipo === "entrada" ? "📈" : "📉"} ${m.descripcion} — **${formatMoney(m.cantidad)}**`)
                  .join("\n")
              : "*Sin movimientos recientes*",
        }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: "🏙️ Banco Nacional RP Premium" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  getCuenta,
  formatMoney,
};
