const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");

function fmt(n) {
  return `$${Number(n).toLocaleString("es-ES")}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("expediente")
    .setDescription("📂 Ver el expediente policial completo de un ciudadano")
    .addUserOption((o) => o.setName("ciudadano").setDescription("Ciudadano a consultar").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const ciudadano = interaction.options.getUser("ciudadano");
    const cedula = db.get("cedulas", ciudadano.id);
    const nombreCiudadano = cedula ? `${cedula.nombre} ${cedula.apellido}` : ciudadano.username;
    const numeroCedula = cedula ? cedula.numeroCedula : "Sin cédula";

    const expKey = `exp_${ciudadano.id}`;
    const exps = db.loadDB("vehiculos");
    const ficha = exps[expKey] || { arrestos: [], multas: [], notas: [] };

    const todosLogs = db.loadDB("logs");

    // Reunir arrestos
    const arrestos = (ficha.arrestos || [])
      .map((id) => todosLogs[id])
      .filter(Boolean)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Reunir multas
    const multas = (ficha.multas || [])
      .map((id) => todosLogs[id])
      .filter(Boolean)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Estadísticas
    const totalMultas = multas.reduce((acc, m) => acc + (m.monto || 0), 0);
    const multasPendientes = multas.filter((m) => m.estado === "pendiente").length;
    const arrestosActivos = arrestos.filter((a) => a.estado === "activo").length;

    // Nivel de peligrosidad
    let peligro = "🟢 BAJO";
    let peligroColor = 0x00d26a;
    const totalIncidentes = arrestos.length + multas.length;
    if (totalIncidentes >= 10) { peligro = "🔴 EXTREMO"; peligroColor = 0x8b0000; }
    else if (totalIncidentes >= 6) { peligro = "🟠 ALTO"; peligroColor = 0xff0000; }
    else if (totalIncidentes >= 3) { peligro = "🟡 MEDIO"; peligroColor = 0xffd700; }

    const ts = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setColor(peligroColor)
      .setTitle("📂 ━━ EXPEDIENTE POLICIAL OFICIAL ━━ 📂")
      .setDescription(
        `**┌──────────────────────────────────────────────────────┐**\n` +
        `**│  📂  REGISTRO CRIMINAL — DEPARTAMENTO DE POLICÍA RP  │**\n` +
        `**└──────────────────────────────────────────────────────┘**\n\n` +
        `> *Expediente confidencial del ciudadano. Uso restringido a personal autorizado.*`
      )
      .addFields(
        {
          name: "🪪 Identificación",
          value: `<@${ciudadano.id}>\n**${nombreCiudadano}**\nCédula: \`${numeroCedula}\``,
          inline: true,
        },
        {
          name: "📊 Peligrosidad",
          value: `\`\`\`fix\n${peligro}\n\`\`\``,
          inline: true,
        },
        {
          name: "🕐 Consultado",
          value: `<t:${ts}:T>`,
          inline: true,
        },
        {
          name: "━━━━━━━━━━━━ RESUMEN ━━━━━━━━━━━━",
          value: "\u200b",
        },
        {
          name: "🚔 Arrestos Totales",
          value: `**${arrestos.length}**`,
          inline: true,
        },
        {
          name: "🚔 Arrestos Activos",
          value: `**${arrestosActivos}**`,
          inline: true,
        },
        {
          name: "📅 Último Arresto",
          value: arrestos[0]
            ? `<t:${Math.floor(new Date(arrestos[0].fecha).getTime() / 1000)}:R>`
            : "*Ninguno*",
          inline: true,
        },
        {
          name: "💸 Multas Totales",
          value: `**${multas.length}**`,
          inline: true,
        },
        {
          name: "⏳ Multas Pendientes",
          value: `**${multasPendientes}**`,
          inline: true,
        },
        {
          name: "💰 Deuda Total",
          value: `**${fmt(totalMultas)}**`,
          inline: true,
        },
        {
          name: "━━━━━━━━━ ÚLTIMOS ARRESTOS ━━━━━━━━━",
          value:
            arrestos.length > 0
              ? arrestos.slice(0, 4).map((a) =>
                  `> 🚔 \`${new Date(a.fecha).toLocaleDateString("es-ES")}\` — **${a.motivo}** | *${a.cargo}* | ${a.estado === "activo" ? "🔴 Activo" : "✅ Libre"}`
                ).join("\n")
              : "> *Sin arrestos registrados*",
        },
        {
          name: "━━━━━━━━━ ÚLTIMAS MULTAS ━━━━━━━━━━",
          value:
            multas.length > 0
              ? multas.slice(0, 4).map((m) =>
                  `> 💸 \`${new Date(m.fecha).toLocaleDateString("es-ES")}\` — **${m.infraccion}** | ${fmt(m.monto)} | ${
                    m.estado === "pendiente" ? "⏳ Pendiente" : m.estado === "pagada" ? "✅ Pagada" : m.estado === "cobrada" ? "💰 Cobrada" : "🗑️ Anulada"
                  }`
                ).join("\n")
              : "> *Sin multas registradas*",
        }
      )
      .setThumbnail(ciudadano.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp()
      .setFooter({ text: `🏙️ Departamento de Policía RP Premium • Expediente: ${ciudadano.id.slice(-6)}` });

    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`exp_nota_${ciudadano.id}`)
        .setLabel("📝 Añadir Nota")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`exp_limpiar_${ciudadano.id}`)
        .setLabel("🗑️ Limpiar Expediente")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`exp_imprimir_${ciudadano.id}`)
        .setLabel("🖨️ Resumen TXT")
        .setStyle(ButtonStyle.Secondary)
    );

    const reply = await interaction.editReply({ embeds: [embed], components: [botones] });

    log("EXPEDIENTE", "Expediente consultado", interaction.user.tag, nombreCiudadano);

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (!i.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return i.reply({ content: "❌ Sin permisos.", ephemeral: true });
      }

      if (i.customId === `exp_nota_${ciudadano.id}`) {
        const expData = db.loadDB("vehiculos");
        if (!expData[expKey]) expData[expKey] = { arrestos: [], multas: [], notas: [] };
        expData[expKey].notas = expData[expKey].notas || [];
        expData[expKey].notas.push({
          texto: `Nota agregada por ${i.user.tag}`,
          fecha: new Date().toISOString(),
          autor: i.user.tag,
        });
        db.saveDB("vehiculos", expData);
        await i.reply({
          content: `📝 Nota añadida al expediente de **${nombreCiudadano}**.\n> *Usa el comando nuevamente para personalizar notas próximamente.*`,
          ephemeral: true,
        });
      }

      if (i.customId === `exp_limpiar_${ciudadano.id}`) {
        const expData = db.loadDB("vehiculos");
        expData[expKey] = { userId: ciudadano.id, arrestos: [], multas: [], notas: [] };
        db.saveDB("vehiculos", expData);
        await i.reply({
          content: `🗑️ Expediente de **${nombreCiudadano}** limpiado. Los arrestos/multas individuales siguen en logs.`,
          ephemeral: true,
        });
        log("EXPEDIENTE", "Expediente limpiado", i.user.tag, nombreCiudadano);
      }

      if (i.customId === `exp_imprimir_${ciudadano.id}`) {
        const lineas = [
          `════════════════════════════════════════`,
          `   EXPEDIENTE POLICIAL OFICIAL — RP `,
          `════════════════════════════════════════`,
          `Ciudadano : ${nombreCiudadano}`,
          `Discord   : ${ciudadano.tag}`,
          `Cédula    : ${numeroCedula}`,
          `Peligrosid: ${peligro.replace(/[^\w\s]/g, "").trim()}`,
          ``,
          `── ARRESTOS (${arrestos.length}) ──────────────────────`,
          ...arrestos.slice(0, 10).map((a, idx) =>
            `[${idx + 1}] ${new Date(a.fecha).toLocaleDateString("es-ES")} | ${a.motivo} | ${a.cargo} | ${a.estado}`
          ),
          arrestos.length === 0 ? "  Sin arrestos registrados" : "",
          ``,
          `── MULTAS (${multas.length}) ────────────────────────`,
          ...multas.slice(0, 10).map((m, idx) =>
            `[${idx + 1}] ${new Date(m.fecha).toLocaleDateString("es-ES")} | ${m.infraccion} | ${fmt(m.monto)} | ${m.estado}`
          ),
          multas.length === 0 ? "  Sin multas registradas" : "",
          ``,
          `Deuda Total : ${fmt(totalMultas)}`,
          `Generado    : ${new Date().toLocaleString("es-ES")}`,
          `Oficial     : ${i.user.tag}`,
          `════════════════════════════════════════`,
        ].join("\n");

        const buffer = Buffer.from(lineas, "utf-8");
        const attachment = new AttachmentBuilder(buffer, {
          name: `expediente_${ciudadano.id.slice(-6)}.txt`,
        });

        await i.reply({
          content: `🖨️ Expediente de **${nombreCiudadano}** generado:`,
          files: [attachment],
          ephemeral: true,
        });
      }
    });
  },
};
