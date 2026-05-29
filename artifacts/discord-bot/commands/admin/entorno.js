const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");

const PRIORIDADES = {
  baja: { color: 0x5865f2, emoji: "🔵", label: "BAJA" },
  media: { color: 0xffd700, emoji: "🟡", label: "MEDIA" },
  alta: { color: 0xff6b35, emoji: "🟠", label: "ALTA" },
  critica: { color: 0xff0000, emoji: "🔴", label: "CRÍTICA" },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("entorno")
    .setDescription("📡 Reportar un nuevo entorno RP en la ciudad")
    .addStringOption((opt) =>
      opt.setName("ubicacion").setDescription("Ubicación del entorno (ej: Calle 5 con Av. Principal)").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("descripcion").setDescription("Descripción del entorno RP").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("prioridad").setDescription("Nivel de prioridad").setRequired(false)
      .addChoices(
        { name: "🔵 Baja", value: "baja" },
        { name: "🟡 Media", value: "media" },
        { name: "🟠 Alta", value: "alta" },
        { name: "🔴 Crítica", value: "critica" }
      )
    ),

  async execute(interaction) {
    const ubicacion = interaction.options.getString("ubicacion");
    const descripcion = interaction.options.getString("descripcion");
    const prioridad = interaction.options.getString("prioridad") || "media";
    const ahora = new Date();
    const ts = Math.floor(ahora.getTime() / 1000);
    const entornoId = `entorno_${Date.now()}`;

    const p = PRIORIDADES[prioridad];

    const entornos = db.loadDB("logs");
    entornos[entornoId] = {
      tipo: "ENTORNO",
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      ubicacion,
      descripcion,
      prioridad,
      inicio: ahora.toISOString(),
      estado: "pendiente",
      atiende: null,
      enCamino: null,
    };
    db.saveDB("logs", entornos);

    const embed = buildEmbedEntorno(interaction.user, ubicacion, descripcion, p, ts, "⏳ PENDIENTE", null, null);

    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`entorno_atender_${entornoId}`)
        .setLabel("🚓 Atender Entorno")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`entorno_camino_${entornoId}`)
        .setLabel("📍 Marcar En Camino")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`entorno_finalizar_${entornoId}`)
        .setLabel("✅ Entorno Finalizado")
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [botones], fetchReply: true });

    log("ENTORNO", "Nuevo entorno reportado", interaction.user.tag, `Ubicación: ${ubicacion} | Prioridad: ${p.label}`);

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 4 * 60 * 60 * 1000,
    });

    let estado = "⏳ PENDIENTE";
    let atiende = null;
    let enCamino = null;

    collector.on("collect", async (i) => {
      if (i.customId === `entorno_atender_${entornoId}`) {
        atiende = i.user;
        estado = "🚓 EN ATENCIÓN";
        const entornosDB = db.loadDB("logs");
        if (entornosDB[entornoId]) {
          entornosDB[entornoId].estado = "en_atencion";
          entornosDB[entornoId].atiende = i.user.tag;
          db.saveDB("logs", entornosDB);
        }
        await i.reply({ content: `🚓 **${i.user.username}** está atendiendo el entorno en **${ubicacion}**.` });
        await msg.edit({ embeds: [buildEmbedEntorno(interaction.user, ubicacion, descripcion, p, ts, estado, atiende, enCamino)], components: [botones] });
      }

      if (i.customId === `entorno_camino_${entornoId}`) {
        enCamino = i.user;
        if (estado === "⏳ PENDIENTE") estado = "📍 UNIDAD EN CAMINO";
        const entornosDB = db.loadDB("logs");
        if (entornosDB[entornoId]) {
          entornosDB[entornoId].enCamino = i.user.tag;
          db.saveDB("logs", entornosDB);
        }
        await i.reply({ content: `📍 **${i.user.username}** está en camino a **${ubicacion}**.` });
        await msg.edit({ embeds: [buildEmbedEntorno(interaction.user, ubicacion, descripcion, p, ts, estado, atiende, enCamino)], components: [botones] });
      }

      if (i.customId === `entorno_finalizar_${entornoId}`) {
        collector.stop("finalizado");
        const entornosDB = db.loadDB("logs");
        if (entornosDB[entornoId]) {
          entornosDB[entornoId].estado = "finalizado";
          entornosDB[entornoId].fin = new Date().toISOString();
          db.saveDB("logs", entornosDB);
        }

        const embedFin = new EmbedBuilder()
          .setColor(0x00d26a)
          .setTitle("✅ ENTORNO RP FINALIZADO")
          .setDescription(
            `**┌────────────────────────────────────────────────┐**\n` +
            `**│  ✅  ENTORNO ATENDIDO — SITUACIÓN RESUELTA      │**\n` +
            `**└────────────────────────────────────────────────┘**\n\n` +
            `> *El entorno ha sido atendido y resuelto correctamente.*\n` +
            `> *Las unidades han retornado a sus posiciones habituales.*`
          )
          .addFields(
            { name: "📍 Ubicación", value: `**${ubicacion}**`, inline: true },
            { name: "👤 Reportó", value: `<@${interaction.user.id}>`, inline: true },
            { name: "🚓 Atendió", value: atiende ? `<@${atiende.id}>` : "*Sin asignar*", inline: true },
            { name: "🕐 Finalizado", value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true },
            { name: `${p.emoji} Prioridad`, value: p.label, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: "🏙️ Sistema de Entornos RP Premium" });

        const btnsOff = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("e1").setLabel("🚓 Atender").setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId("e2").setLabel("📍 En Camino").setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("e3").setLabel("✅ Finalizado").setStyle(ButtonStyle.Secondary).setDisabled(true)
        );

        await msg.edit({ embeds: [embedFin], components: [btnsOff] });
        await i.reply({ content: `✅ Entorno en **${ubicacion}** marcado como finalizado.` });
        log("ENTORNO", "Entorno finalizado", i.user.tag, `Ubicación: ${ubicacion}`);
      }
    });
  },
};

function buildEmbedEntorno(user, ubicacion, descripcion, p, ts, estado, atiende, enCamino) {
  const estadoColor = {
    "⏳ PENDIENTE": 0x5865f2,
    "📍 UNIDAD EN CAMINO": 0xffd700,
    "🚓 EN ATENCIÓN": 0xff6b35,
  };

  return new EmbedBuilder()
    .setColor(estadoColor[estado] || p.color)
    .setTitle("📡 ━━ NUEVO ENTORNO REPORTADO ━━ 📡")
    .setDescription(
      `**┌──────────────────────────────────────────────────────┐**\n` +
      `**│  📡  REPORTE CIUDADANO — ENTORNO RP ACTIVO           │**\n` +
      `**└──────────────────────────────────────────────────────┘**\n\n` +
      `> *Se ha recibido un nuevo reporte ciudadano dentro del entorno Roleplay.*\n` +
      `> *Las unidades disponibles deben responder a la brevedad.*`
    )
    .addFields(
      { name: "👤 Reportante", value: `<@${user.id}>`, inline: true },
      { name: "🕐 Hora Reporte", value: `<t:${ts}:T>`, inline: true },
      { name: "📅 Fecha", value: `<t:${ts}:D>`, inline: true },
      { name: "📍 Ubicación", value: `> 🗺️ **${ubicacion}**` },
      { name: "📋 Descripción del Entorno", value: `> *${descripcion}*` },
      { name: `${p.emoji} Nivel de Prioridad`, value: `\`\`\`fix\n${p.label}\n\`\`\``, inline: true },
      {
        name: "📊 Estado de Atención",
        value: `\`\`\`fix\n${estado}\n\`\`\``,
        inline: true,
      },
      {
        name: "👮 Asignación",
        value:
          `🚓 **Atiende:** ${atiende ? `<@${atiende.id}>` : "*Sin asignar*"}\n` +
          `📍 **En Camino:** ${enCamino ? `<@${enCamino.id}>` : "*Nadie asignado*"}`,
      },
      {
        name: "📻 Instrucciones",
        value:
          "> 1️⃣ Usa **🚓 Atender Entorno** para asignarte al caso\n" +
          "> 2️⃣ Usa **📍 Marcar En Camino** si te desplazas hacia la zona\n" +
          "> 3️⃣ Usa **✅ Entorno Finalizado** cuando el caso esté resuelto",
      }
    )
    .setTimestamp()
    .setFooter({ text: `🏙️ Sistema de Entornos RP Premium • ID: ${ts}` });
}
