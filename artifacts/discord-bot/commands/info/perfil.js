const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../database/db");
const { COLORS } = require("../../functions/embeds");

function formatMoney(n) {
  return `$${Number(n).toLocaleString("es-ES")}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("👤 Ver tu perfil RP completo")
    .addUserOption((opt) => opt.setName("usuario").setDescription("Ver perfil de otro usuario").setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") || interaction.user;

    const cedula = db.get("cedulas", target.id);
    const banco = db.get("banco", target.id);
    const vehiculos = db.getAll("vehiculos");
    const licencia = db.get("licencias", target.id);

    const vehiculosUsuario = Object.values(vehiculos).filter((v) => v.userId === target.id);
    const cuenta = banco || { efectivo: 0, banco: 0 };

    const embed = new EmbedBuilder()
      .setColor(COLORS.azul)
      .setTitle(`👤 PERFIL RP — ${target.username.toUpperCase()}`)
      .setDescription(`> Expediente completo de <@${target.id}>`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: "🪪 Identidad",
          value: cedula
            ? `**Nombre:** ${cedula.nombre} ${cedula.apellido}\n**Cédula:** \`${cedula.numeroCedula}\`\n**Edad:** ${cedula.edad} años\n**Nac.:** ${cedula.nacionalidad}`
            : "*Sin cédula registrada*",
          inline: true,
        },
        {
          name: "🏦 Economía",
          value: `**Efectivo:** ${formatMoney(cuenta.efectivo)}\n**Banco:** ${formatMoney(cuenta.banco)}\n**Total:** ${formatMoney(cuenta.efectivo + cuenta.banco)}`,
          inline: true,
        },
        {
          name: "🚗 Vehículos",
          value:
            vehiculosUsuario.length > 0
              ? vehiculosUsuario.map((v) => `\`${v.placa}\` — ${v.marca} ${v.modelo}`).join("\n")
              : "*Sin vehículos registrados*",
          inline: false,
        },
        {
          name: "🚘 Licencia",
          value: licencia
            ? `**Categoría ${licencia.categoria}** | N°: \`${licencia.numeroLicencia}\``
            : "*Sin licencia de conducción*",
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: "🏙️ Sistema RP Premium" });

    await interaction.reply({ embeds: [embed] });
  },
};
