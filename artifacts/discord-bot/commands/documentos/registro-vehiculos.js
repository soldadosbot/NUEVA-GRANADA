const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");
const { COLORS } = require("../../functions/embeds");
const { generarTarjetaVehiculo } = require("../../functions/canvasHelper");

function generarPlaca() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "0123456789";
  const L = () => letras[Math.floor(Math.random() * letras.length)];
  const N = () => nums[Math.floor(Math.random() * nums.length)];
  return `${L()}${L()}${L()}-${N()}${N()}${N()}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("registro-vehiculos")
    .setDescription("🚗 Registrar un vehículo a tu nombre")
    .addStringOption((opt) => opt.setName("marca").setDescription("Marca del vehículo").setRequired(true))
    .addStringOption((opt) => opt.setName("modelo").setDescription("Modelo del vehículo").setRequired(true))
    .addStringOption((opt) => opt.setName("color").setDescription("Color del vehículo").setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    const cedula = db.get("cedulas", interaction.user.id);
    if (!cedula) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Cédula requerida")
            .setDescription("> Debes tener una cédula registrada para registrar un vehículo.\n> Usa `/registrar-cedula` primero."),
        ],
      });
    }

    const marca = interaction.options.getString("marca");
    const modelo = interaction.options.getString("modelo");
    const color = interaction.options.getString("color");

    let placa;
    do {
      placa = generarPlaca();
    } while (db.get("vehiculos", placa));

    const vehiculos = db.getAll("vehiculos");
    const vehiculosUsuario = Object.values(vehiculos).filter((v) => v.userId === interaction.user.id);
    if (vehiculosUsuario.length >= 5) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Límite de vehículos")
            .setDescription("> Ya tienes **5 vehículos** registrados. Ese es el límite máximo."),
        ],
      });
    }

    const datos = {
      placa,
      marca,
      modelo,
      color,
      propietario: `${cedula.nombre} ${cedula.apellido}`,
      userId: interaction.user.id,
      discordTag: interaction.user.tag,
      avatarURL: interaction.user.displayAvatarURL({ extension: "png" }),
      fechaRegistro: new Date().toISOString(),
    };

    try {
      const imagenBuffer = await generarTarjetaVehiculo(datos);
      db.set("vehiculos", placa, datos);

      const attachment = new AttachmentBuilder(imagenBuffer, { name: `vehiculo_${placa}.png` });
      const embed = new EmbedBuilder()
        .setColor(COLORS.azul)
        .setTitle("🚗 VEHÍCULO REGISTRADO EXITOSAMENTE")
        .setDescription(`> Tu vehículo ha sido registrado en el sistema de tránsito RP.`)
        .addFields(
          { name: "🚘 Placa", value: `\`${placa}\``, inline: true },
          { name: "🏭 Marca", value: marca, inline: true },
          { name: "📋 Modelo", value: modelo, inline: true },
          { name: "🎨 Color", value: color, inline: true },
          { name: "👤 Propietario", value: `<@${interaction.user.id}>`, inline: true },
          { name: "📅 Registro", value: new Date().toLocaleDateString("es-ES"), inline: true }
        )
        .setImage(`attachment://vehiculo_${placa}.png`)
        .setTimestamp()
        .setFooter({ text: "🏙️ Ministerio de Transporte RP Premium" });

      await interaction.editReply({ embeds: [embed], files: [attachment] });
      log("VEHICULO", "Vehículo registrado", interaction.user.tag, `Placa: ${placa} | ${marca} ${modelo}`);
    } catch (err) {
      console.error(err);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder().setColor(COLORS.rojo).setTitle("❌ Error").setDescription(`> \`${err.message}\``),
        ],
      });
    }
  },
};
