const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");
const { COLORS } = require("../../functions/embeds");
const { getCuenta, formatMoney } = require("./banco");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("retiro")
    .setDescription("💸 Retirar dinero de tu cuenta bancaria")
    .addIntegerOption((opt) =>
      opt.setName("cantidad").setDescription("Cantidad a retirar").setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    const cantidad = interaction.options.getInteger("cantidad");
    const cuenta = getCuenta(interaction.user.id);

    if (cuenta.banco < cantidad) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Fondos insuficientes")
            .setDescription(`> Saldo insuficiente en cuenta.\n> Saldo disponible: **${formatMoney(cuenta.banco)}**`),
        ],
        ephemeral: true,
      });
    }

    cuenta.banco -= cantidad;
    cuenta.efectivo += cantidad;
    cuenta.historial = cuenta.historial || [];
    cuenta.historial.push({
      tipo: "retiro",
      descripcion: `Retiro bancario`,
      cantidad,
      fecha: new Date().toISOString(),
    });
    db.set("banco", interaction.user.id, cuenta);

    const embed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setTitle("✅ RETIRO REALIZADO")
      .addFields(
        { name: "💸 Retirado", value: `**${formatMoney(cantidad)}**`, inline: true },
        { name: "🏦 Saldo Banco", value: `**${formatMoney(cuenta.banco)}**`, inline: true },
        { name: "💵 Efectivo Ahora", value: `**${formatMoney(cuenta.efectivo)}**`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "🏙️ Banco Nacional RP Premium" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    log("BANCO", "Retiro", interaction.user.tag, `Cantidad: ${formatMoney(cantidad)}`);
  },
};
