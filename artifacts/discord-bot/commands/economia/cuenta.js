const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../database/db");
const { COLORS } = require("../../functions/embeds");
const { getCuenta, formatMoney } = require("./banco");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cuenta")
    .setDescription("📊 Ver historial completo de tu cuenta bancaria"),

  async execute(interaction) {
    const cuenta = getCuenta(interaction.user.id);
    const historial = (cuenta.historial || []).slice(-10).reverse();

    const embed = new EmbedBuilder()
      .setColor(COLORS.azul)
      .setTitle("📊 HISTORIAL DE CUENTA BANCARIA")
      .setDescription(
        `> Últimas **${historial.length}** transacciones de tu cuenta.\n\n` +
        `💵 **Efectivo:** ${formatMoney(cuenta.efectivo)}\n` +
        `🏦 **Banco:** ${formatMoney(cuenta.banco)}\n` +
        `💰 **Total:** ${formatMoney(cuenta.efectivo + cuenta.banco)}`
      )
      .addFields({
        name: "📋 Movimientos Recientes",
        value:
          historial.length > 0
            ? historial
                .map((m) => {
                  const fecha = new Date(m.fecha).toLocaleDateString("es-ES");
                  const emoji = m.tipo === "entrada" || m.tipo === "deposito" ? "📈" : "📉";
                  return `${emoji} \`${fecha}\` — ${m.descripcion} — **${formatMoney(m.cantidad)}**`;
                })
                .join("\n")
            : "*No hay movimientos registrados aún.*",
      })
      .setTimestamp()
      .setFooter({ text: "🏙️ Banco Nacional RP Premium" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
