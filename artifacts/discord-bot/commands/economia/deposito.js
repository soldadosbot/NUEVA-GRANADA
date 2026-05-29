const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");
const { COLORS } = require("../../functions/embeds");
const { getCuenta, formatMoney } = require("./banco");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deposito")
    .setDescription("💰 Depositar dinero en tu cuenta bancaria")
    .addIntegerOption((opt) =>
      opt.setName("cantidad").setDescription("Cantidad a depositar").setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    const cantidad = interaction.options.getInteger("cantidad");
    const cuenta = getCuenta(interaction.user.id);

    if (cuenta.efectivo < cantidad) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Fondos insuficientes")
            .setDescription(`> No tienes suficiente efectivo.\n> Efectivo disponible: **${formatMoney(cuenta.efectivo)}**`),
        ],
        ephemeral: true,
      });
    }

    cuenta.efectivo -= cantidad;
    cuenta.banco += cantidad;
    cuenta.historial = cuenta.historial || [];
    cuenta.historial.push({
      tipo: "deposito",
      descripcion: `Depósito bancario`,
      cantidad,
      fecha: new Date().toISOString(),
    });
    db.set("banco", interaction.user.id, cuenta);

    const embed = new EmbedBuilder()
      .setColor(COLORS.verde)
      .setTitle("✅ DEPÓSITO REALIZADO")
      .addFields(
        { name: "💰 Depositado", value: `**${formatMoney(cantidad)}**`, inline: true },
        { name: "💵 Efectivo Restante", value: `**${formatMoney(cuenta.efectivo)}**`, inline: true },
        { name: "🏦 Nuevo Saldo Banco", value: `**${formatMoney(cuenta.banco)}**`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "🏙️ Banco Nacional RP Premium" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    log("BANCO", "Depósito", interaction.user.tag, `Cantidad: ${formatMoney(cantidad)}`);
  },
};
