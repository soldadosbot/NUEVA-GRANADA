const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");
const { COLORS } = require("../../functions/embeds");
const { generarCedula } = require("../../functions/canvasHelper");

function generarNumeroCedula() {
  const cedulas = db.getAll("cedulas");
  const nums = Object.values(cedulas).map((c) => parseInt(c.numeroCedula) || 0);
  const ultimo = nums.length > 0 ? Math.max(...nums) : 10000000;
  return String(ultimo + 1).padStart(8, "0");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("registrar-cedula")
    .setDescription("🪪 Registrar tu cédula de identidad RP")
    .addStringOption((opt) => opt.setName("nombre").setDescription("Tu nombre").setRequired(true))
    .addStringOption((opt) => opt.setName("apellido").setDescription("Tu apellido").setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName("edad").setDescription("Tu edad").setRequired(true).setMinValue(18).setMaxValue(80)
    )
    .addStringOption((opt) =>
      opt.setName("nacionalidad").setDescription("Tu nacionalidad").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("fecha_nacimiento").setDescription("Fecha de nacimiento (DD/MM/YYYY)").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const userId = interaction.user.id;
    const cedulaExistente = db.get("cedulas", userId);
    if (cedulaExistente) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Cédula ya registrada")
            .setDescription(
              `> Ya tienes una cédula registrada con el número **${cedulaExistente.numeroCedula}**.\n> Usa \`/ver-cedula\` para verla.`
            ),
        ],
      });
    }

    const nombre = interaction.options.getString("nombre");
    const apellido = interaction.options.getString("apellido");
    const edad = interaction.options.getInteger("edad");
    const nacionalidad = interaction.options.getString("nacionalidad");
    const fechaNacimientoStr = interaction.options.getString("fecha_nacimiento");

    const [dia, mes, anio] = fechaNacimientoStr.split("/");
    const fechaNacimiento = new Date(anio, mes - 1, dia);
    if (isNaN(fechaNacimiento.getTime())) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Formato de fecha inválido")
            .setDescription("> Usa el formato **DD/MM/YYYY** (ej: 15/03/1995)"),
        ],
      });
    }

    const numeroCedula = generarNumeroCedula();
    const fechaEmision = new Date();
    const fechaVencimiento = new Date();
    fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 10);

    const avatarURL = interaction.user.displayAvatarURL({ extension: "png", size: 256 });

    const datosCedula = {
      userId,
      discordTag: interaction.user.tag,
      discordId: userId,
      nombre,
      apellido,
      edad,
      nacionalidad,
      fechaNacimiento: fechaNacimiento.toISOString(),
      numeroCedula,
      fechaEmision: fechaEmision.toISOString(),
      fechaVencimiento: fechaVencimiento.toISOString(),
      avatarURL,
    };

    try {
      const imagenBuffer = await generarCedula(datosCedula);
      db.set("cedulas", userId, datosCedula);

      const attachment = new AttachmentBuilder(imagenBuffer, { name: `cedula_${numeroCedula}.png` });

      const embed = new EmbedBuilder()
        .setColor(COLORS.dorado)
        .setTitle("🪪 CÉDULA REGISTRADA EXITOSAMENTE")
        .setDescription(
          `> ¡Tu documento de identidad ha sido emitido y registrado oficialmente!\n\n` +
          `**┌────────────────────────────────┐**\n` +
          `**│   DATOS DEL DOCUMENTO          │**\n` +
          `**└────────────────────────────────┘**`
        )
        .addFields(
          { name: "👤 Nombre Completo", value: `**${nombre} ${apellido}**`, inline: true },
          { name: "🔢 N° Cédula", value: `\`${numeroCedula}\``, inline: true },
          { name: "🌍 Nacionalidad", value: `**${nacionalidad}**`, inline: true },
          { name: "🎂 Edad", value: `**${edad} años**`, inline: true },
          { name: "📅 Emisión", value: `**${fechaEmision.toLocaleDateString("es-ES")}**`, inline: true },
          { name: "⏳ Vencimiento", value: `**${fechaVencimiento.toLocaleDateString("es-ES")}**`, inline: true }
        )
        .setImage(`attachment://cedula_${numeroCedula}.png`)
        .setTimestamp()
        .setFooter({ text: "🏙️ Registro Civil RP Premium" });

      await interaction.editReply({ embeds: [embed], files: [attachment] });
      log("CEDULA", "Cédula registrada", interaction.user.tag, `N°: ${numeroCedula}`);
    } catch (err) {
      console.error("Error generando cédula:", err);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Error generando cédula")
            .setDescription(`> Ocurrió un error al generar tu cédula. Intenta nuevamente.\n> \`${err.message}\``),
        ],
      });
    }
  },
};
