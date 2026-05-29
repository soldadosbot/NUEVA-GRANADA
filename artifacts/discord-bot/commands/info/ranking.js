const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../database/db");
const { COLORS } = require("../../functions/embeds");

function formatMoney(n) {
  return `$${Number(n).toLocaleString("es-ES")}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("🏆 Ver el ranking de los más ricos del servidor"),

  async execute(interaction) {
    const cuentas = db.getAll("banco");
    const cedulas = db.getAll("cedulas");

    const ranking = Object.values(cuentas)
      .map((c) => ({
        userId: c.userId,
        total: (c.efectivo || 0) + (c.banco || 0),
        efectivo: c.efectivo || 0,
        banco: c.banco || 0,
        nombre: cedulas[c.userId] ? `${cedulas[c.userId].nombre} ${cedulas[c.userId].apellido}` : null,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const medallas = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    const embed = new EmbedBuilder()
      .setColor(COLORS.dorado)
      .setTitle("🏆 RANKING DE RIQUEZA — TOP 10")
      .setDescription(
        `**Los ciudadanos más adinerados del servidor RP.**\n\n` +
        ranking
          .map((entry, i) => {
            const nombre = entry.nombre || `<@${entry.userId}>`;
            return `${medallas[i]} **${nombre}** — ${formatMoney(entry.total)}`;
          })
          .join("\n") || "*No hay datos aún.*"
      )
      .setTimestamp()
      .setFooter({ text: "🏙️ Banco Nacional RP Premium" });

    await interaction.reply({ embeds: [embed] });
  },
};
