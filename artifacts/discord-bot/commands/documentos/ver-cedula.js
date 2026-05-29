const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const db = require("../../database/db");
const { COLORS } = require("../../functions/embeds");
const { generarCedula } = require("../../functions/canvasHelper");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ver-cedula")
    .setDescription("👁️ Ver tu cédula de identidad RP")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Ver cédula de otro usuario (solo admins)").setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser("usuario") || interaction.user;
    const userId = target.id;
    const cedula = db.get("cedulas", userId);

    if (!cedula) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Cédula no encontrada")
            .setDescription(
              target.id === interaction.user.id
                ? "> No tienes una cédula registrada. Usa `/registrar-cedula` para obtener la tuya."
                : `> El usuario <@${target.id}> no tiene cédula registrada.`
            ),
        ],
      });
    }

    try {
      const imagenBuffer = await generarCedula(cedula);
      const attachment = new AttachmentBuilder(imagenBuffer, { name: `cedula_${cedula.numeroCedula}.png` });

      const embed = new EmbedBuilder()
        .setColor(COLORS.dorado)
        .setTitle("🪪 DOCUMENTO DE IDENTIDAD OFICIAL")
        .setDescription(`> Cédula de **${cedula.nombre} ${cedula.apellido}**`)
        .addFields(
          { name: "🔢 N° Cédula", value: `\`${cedula.numeroCedula}\``, inline: true },
          { name: "🌍 Nacionalidad", value: cedula.nacionalidad, inline: true },
          { name: "🎂 Edad", value: `${cedula.edad} años`, inline: true },
          { name: "⏳ Vencimiento", value: new Date(cedula.fechaVencimiento).toLocaleDateString("es-ES"), inline: true },
          { name: "🆔 Discord", value: `<@${cedula.discordId}>`, inline: true }
        )
        .setImage(`attachment://cedula_${cedula.numeroCedula}.png`)
        .setTimestamp()
        .setFooter({ text: "🏙️ Registro Civil RP Premium" });

      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (err) {
      console.error(err);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Error")
            .setDescription(`> Error al regenerar la cédula.\n> \`${err.message}\``),
        ],
      });
    }
  },
};
