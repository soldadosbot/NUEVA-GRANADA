const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");
const { COLORS } = require("../../functions/embeds");
const { getCuenta, formatMoney } = require("./banco");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pagar")
    .setDescription("💸 Transferir dinero a otro jugador")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario destino").setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName("cantidad").setDescription("Cantidad a transferir").setRequired(true).setMinValue(1)
    )
    .addStringOption((opt) => opt.setName("razon").setDescription("Razón del pago").setRequired(false)),

  async execute(interaction) {
    const destino = interaction.options.getUser("usuario");
    const cantidad = interaction.options.getInteger("cantidad");
    const razon = interaction.options.getString("razon") || "Sin especificar";

    if (destino.id === interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Error")
            .setDescription("> No puedes pagarte a ti mismo."),
        ],
        ephemeral: true,
      });
    }

    if (destino.bot) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder().setColor(COLORS.rojo).setTitle("❌ Error").setDescription("> No puedes pagar a un bot."),
        ],
        ephemeral: true,
      });
    }

    const cuentaOrigen = getCuenta(interaction.user.id);

    if (cuentaOrigen.efectivo < cantidad) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Fondos insuficientes")
            .setDescription(
              `> No tienes suficiente **efectivo** para esta transferencia.\n> Efectivo disponible: **${formatMoney(cuentaOrigen.efectivo)}**\n\n> 💡 Usa \`/retiro\` para retirar del banco primero.`
            ),
        ],
        ephemeral: true,
      });
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(COLORS.dorado)
      .setTitle("💸 CONFIRMAR TRANSFERENCIA")
      .setDescription("> Por favor confirma los detalles de la transferencia antes de proceder.")
      .addFields(
        { name: "👤 Destinatario", value: `<@${destino.id}>`, inline: true },
        { name: "💰 Cantidad", value: `**${formatMoney(cantidad)}**`, inline: true },
        { name: "📋 Razón", value: `*${razon}*`, inline: false },
        { name: "💵 Tu Efectivo Actual", value: `**${formatMoney(cuentaOrigen.efectivo)}**`, inline: true },
        { name: "💵 Efectivo Restante", value: `**${formatMoney(cuentaOrigen.efectivo - cantidad)}**`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "⏳ Tienes 30 segundos para confirmar" });

    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("pago_confirmar")
        .setLabel("✅ Confirmar Pago")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("pago_cancelar")
        .setLabel("❌ Cancelar")
        .setStyle(ButtonStyle.Danger)
    );

    const reply = await interaction.reply({
      embeds: [confirmEmbed],
      components: [botones],
      ephemeral: true,
      fetchReply: true,
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
      max: 1,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "pago_cancelar") {
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.rojo)
              .setTitle("❌ Transferencia Cancelada")
              .setDescription("> Has cancelado la transferencia."),
          ],
          components: [],
        });
        return;
      }

      const cO = getCuenta(interaction.user.id);
      const cD = getCuenta(destino.id);

      if (cO.efectivo < cantidad) {
        return i.update({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.rojo)
              .setTitle("❌ Fondos insuficientes")
              .setDescription("> Tu saldo cambió. No puedes completar la transferencia."),
          ],
          components: [],
        });
      }

      cO.efectivo -= cantidad;
      cD.efectivo += cantidad;

      const entrada = { tipo: "entrada", descripcion: `Recibido de ${interaction.user.tag}: ${razon}`, cantidad, fecha: new Date().toISOString() };
      const salida = { tipo: "salida", descripcion: `Enviado a ${destino.tag}: ${razon}`, cantidad, fecha: new Date().toISOString() };

      cO.historial = cO.historial || [];
      cD.historial = cD.historial || [];
      cO.historial.push(salida);
      cD.historial.push(entrada);

      db.set("banco", interaction.user.id, cO);
      db.set("banco", destino.id, cD);

      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.verde)
            .setTitle("✅ TRANSFERENCIA COMPLETADA")
            .addFields(
              { name: "💸 Enviado a", value: `<@${destino.id}>`, inline: true },
              { name: "💰 Cantidad", value: `**${formatMoney(cantidad)}**`, inline: true },
              { name: "📋 Razón", value: `*${razon}*`, inline: false },
              { name: "💵 Tu Efectivo Restante", value: `**${formatMoney(cO.efectivo)}**`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: "🏙️ Banco Nacional RP Premium" }),
        ],
        components: [],
      });

      // Notificar al receptor
      try {
        const memberDestino = await interaction.guild.members.fetch(destino.id);
        await memberDestino.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.verde)
              .setTitle("💰 HAS RECIBIDO UNA TRANSFERENCIA")
              .setDescription(`<@${interaction.user.id}> te ha enviado dinero.`)
              .addFields(
                { name: "💰 Cantidad Recibida", value: `**${formatMoney(cantidad)}**`, inline: true },
                { name: "📋 Razón", value: `*${razon}*`, inline: true }
              )
              .setTimestamp()
              .setFooter({ text: "🏙️ Banco Nacional RP Premium" }),
          ],
        });
      } catch {}

      log("BANCO", "Transferencia", interaction.user.tag, `A: ${destino.tag} | Cantidad: ${formatMoney(cantidad)} | Razón: ${razon}`);
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  },
};
