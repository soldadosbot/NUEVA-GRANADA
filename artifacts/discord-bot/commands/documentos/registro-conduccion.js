const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
} = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");
const { COLORS } = require("../../functions/embeds");
const { generarLicencia } = require("../../functions/canvasHelper");

function generarNumeroLicencia() {
  return "LIC-" + Math.random().toString(36).toUpperCase().slice(2, 10);
}

const CATEGORIAS = {
  A: "Motocicletas y vehículos de dos ruedas",
  B: "Automóviles y vehículos livianos",
  C: "Vehículos de carga pesada",
  D: "Transporte público de pasajeros",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("registro-conduccion")
    .setDescription("🚘 Obtener tu licencia de conducción RP"),

  async execute(interaction) {
    const cedula = db.get("cedulas", interaction.user.id);
    if (!cedula) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.rojo)
            .setTitle("❌ Cédula requerida")
            .setDescription("> Necesitas una cédula registrada. Usa `/registrar-cedula` primero."),
        ],
        ephemeral: true,
      });
    }

    const licExistente = db.get("licencias", interaction.user.id);
    if (licExistente) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.naranja)
            .setTitle("⚠️ Ya tienes licencia")
            .setDescription(`> Ya posees la licencia **Categoría ${licExistente.categoria}**.\n> Usa \`/ver-cedula\` para ver tus documentos.`),
        ],
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("sel_categoria_lic")
      .setPlaceholder("📋 Selecciona la categoría de licencia...")
      .addOptions(
        Object.entries(CATEGORIAS).map(([cat, desc]) => ({
          label: `Categoría ${cat}`,
          description: desc,
          value: cat,
          emoji: cat === "A" ? "🏍️" : cat === "B" ? "🚗" : cat === "C" ? "🚛" : "🚌",
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const embedMenu = new EmbedBuilder()
      .setColor(COLORS.verde)
      .setTitle("🚘 SOLICITUD DE LICENCIA DE CONDUCCIÓN")
      .setDescription(
        `> Selecciona la categoría de licencia que deseas obtener.\n\n` +
        `🏍️ **A** — Motocicletas\n🚗 **B** — Automóviles\n🚛 **C** — Carga Pesada\n🚌 **D** — Transporte Público`
      )
      .setFooter({ text: "🏙️ Dirección de Tránsito RP Premium" });

    const reply = await interaction.reply({ embeds: [embedMenu], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
      max: 1,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "❌ No puedes interactuar con este menú.", ephemeral: true });
      }

      await i.deferUpdate();
      const categoria = i.values[0];

      const numeroLicencia = generarNumeroLicencia();
      const fechaEmision = new Date();
      const fechaVencimiento = new Date();
      fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 5);

      const datos = {
        userId: interaction.user.id,
        discordTag: interaction.user.tag,
        nombre: cedula.nombre,
        apellido: cedula.apellido,
        categoria,
        numeroLicencia,
        fechaEmision: fechaEmision.toISOString(),
        fechaVencimiento: fechaVencimiento.toISOString(),
        avatarURL: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
      };

      try {
        const imagenBuffer = await generarLicencia(datos);
        db.set("licencias", interaction.user.id, datos);

        const attachment = new AttachmentBuilder(imagenBuffer, { name: `licencia_${numeroLicencia}.png` });
        const embed = new EmbedBuilder()
          .setColor(COLORS.verde)
          .setTitle("✅ LICENCIA DE CONDUCCIÓN EMITIDA")
          .setDescription(`> Tu licencia **Categoría ${categoria}** ha sido emitida exitosamente.`)
          .addFields(
            { name: "🔢 N° Licencia", value: `\`${numeroLicencia}\``, inline: true },
            { name: "📋 Categoría", value: `**${categoria}** — ${CATEGORIAS[categoria]}`, inline: true },
            { name: "⏳ Válida hasta", value: fechaVencimiento.toLocaleDateString("es-ES"), inline: true }
          )
          .setImage(`attachment://licencia_${numeroLicencia}.png`)
          .setTimestamp()
          .setFooter({ text: "🏙️ Dirección de Tránsito RP Premium" });

        await interaction.editReply({ embeds: [embed], components: [], files: [attachment] });
        log("LICENCIA", "Licencia emitida", interaction.user.tag, `Cat: ${categoria} | N°: ${numeroLicencia}`);
      } catch (err) {
        console.error(err);
        await interaction.editReply({
          embeds: [
            new EmbedBuilder().setColor(COLORS.rojo).setTitle("❌ Error").setDescription(`> \`${err.message}\``),
          ],
          components: [],
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  },
};
