const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ComponentType,
} = require("discord.js");
const db = require("../../database/db");
const { log } = require("../../functions/logger");

function getArrestos() {
  return db.loadDB("logs");
}

function saveArrestos(data) {
  db.saveDB("logs", data);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("arrestar")
    .setDescription("🚔 Registrar el arresto de un ciudadano")
    .addUserOption((o) => o.setName("ciudadano").setDescription("Usuario a arrestar").setRequired(true))
    .addStringOption((o) => o.setName("motivo").setDescription("Motivo del arresto").setRequired(true))
    .addStringOption((o) =>
      o.setName("cargo").setDescription("Cargo legal imputado").setRequired(false)
    )
    .addIntegerOption((o) =>
      o.setName("tiempo").setDescription("Tiempo de prisión en minutos").setRequired(false).setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const ciudadano = interaction.options.getUser("ciudadano");
    const motivo = interaction.options.getString("motivo");
    const cargo = interaction.options.getString("cargo") || "Conducta inapropiada";
    const tiempo = interaction.options.getInteger("tiempo") || 30;
    const ahora = new Date();
    const ts = Math.floor(ahora.getTime() / 1000);
    const arrestoId = `arresto_${Date.now()}`;

    const cedula = db.get("cedulas", ciudadano.id);
    const nombreCiudadano = cedula
      ? `${cedula.nombre} ${cedula.apellido}`
      : ciudadano.username;

    const arrestos = getArrestos();
    arrestos[arrestoId] = {
      tipo: "ARRESTO",
      arrestoId,
      ciudadanoId: ciudadano.id,
      ciudadanoTag: ciudadano.tag,
      nombreCiudadano,
      motivo,
      cargo,
      tiempo,
      oficialId: interaction.user.id,
      oficialTag: interaction.user.tag,
      fecha: ahora.toISOString(),
      estado: "activo",
    };
    saveArrestos(arrestos);

    // Añadir al expediente del ciudadano
    const expKey = `exp_${ciudadano.id}`;
    const expedientes = db.loadDB("vehiculos"); // Reusar como store policial
    if (!expedientes[expKey]) {
      expedientes[expKey] = { userId: ciudadano.id, arrestos: [], multas: [], notas: [] };
    }
    expedientes[expKey].arrestos = expedientes[expKey].arrestos || [];
    expedientes[expKey].arrestos.push(arrestoId);
    db.saveDB("vehiculos", expedientes);

    const liberacion = new Date(ahora.getTime() + tiempo * 60 * 1000);
    const tsLib = Math.floor(liberacion.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🚔 ━━ ARRESTO REGISTRADO ━━ 🚔")
      .setDescription(
        `**┌─────────────────────────────────────────────────┐**\n` +
        `**│  🚔  REPORTE OFICIAL DE ARRESTO — CÓDIGO 10-15  │**\n` +
        `**└─────────────────────────────────────────────────┘**\n\n` +
        `> *Se ha procedido a la detención del siguiente ciudadano conforme a las normas del código penal RP.*`
      )
      .addFields(
        {
          name: "🪪 Detenido",
          value: `<@${ciudadano.id}>\n\`${nombreCiudadano}\``,
          inline: true,
        },
        {
          name: "👮 Oficial Arrestante",
          value: `<@${interaction.user.id}>`,
          inline: true,
        },
        {
          name: "🆔 N° Arresto",
          value: `\`${arrestoId.slice(-10).toUpperCase()}\``,
          inline: true,
        },
        {
          name: "📋 Motivo del Arresto",
          value: `> ⚡ *${motivo}*`,
        },
        {
          name: "⚖️ Cargo Imputado",
          value: `> 📜 **${cargo}**`,
          inline: true,
        },
        {
          name: "⏳ Tiempo de Prisión",
          value: `> 🕐 **${tiempo} minutos**`,
          inline: true,
        },
        {
          name: "🕐 Hora de Arresto",
          value: `<t:${ts}:T> — <t:${ts}:D>`,
          inline: true,
        },
        {
          name: "🔓 Liberación Estimada",
          value: `<t:${tsLib}:T> (<t:${tsLib}:R>)`,
          inline: true,
        },
        {
          name: "🔴 Estado",
          value: "```diff\n- DETENIDO — EN CUSTODIA POLICIAL\n```",
        }
      )
      .setThumbnail(ciudadano.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp()
      .setFooter({ text: `🏙️ Departamento de Policía RP Premium • ${arrestoId.slice(-8).toUpperCase()}` });

    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`arr_liberar_${arrestoId}`)
        .setLabel("🔓 Liberar Ciudadano")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`arr_extender_${arrestoId}`)
        .setLabel("⏰ Extender Tiempo")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`arr_ficha_${arrestoId}`)
        .setLabel("📂 Ver Expediente")
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [botones], fetchReply: true });

    // DM al detenido
    try {
      await ciudadano.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle("🚔 HAS SIDO ARRESTADO")
            .setDescription(
              `> El oficial **${interaction.user.username}** ha procedido a tu detención.\n\n` +
              `**Motivo:** *${motivo}*\n**Cargo:** *${cargo}*\n**Tiempo:** ${tiempo} minutos`
            )
            .setTimestamp()
            .setFooter({ text: "🏙️ Departamento de Policía RP" }),
        ],
      });
    } catch {}

    log("ARRESTO", "Ciudadano arrestado", interaction.user.tag, `${nombreCiudadano} | Motivo: ${motivo}`);

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 4 * 60 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === `arr_liberar_${arrestoId}`) {
        if (!i.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
          return i.reply({ content: "❌ Sin permisos para liberar detenidos.", ephemeral: true });
        }
        const arr = getArrestos();
        if (arr[arrestoId]) {
          arr[arrestoId].estado = "liberado";
          arr[arrestoId].liberadoPor = i.user.tag;
          arr[arrestoId].fechaLiberacion = new Date().toISOString();
          saveArrestos(arr);
        }
        collector.stop("liberado");

        const embedFin = EmbedBuilder.from(embed)
          .setColor(0x00d26a)
          .setTitle("✅ ━━ CIUDADANO LIBERADO ━━ ✅")
          .spliceFields(embed.data.fields.length - 1, 1, {
            name: "🟢 Estado",
            value: "```diff\n+ LIBERADO — PUESTO EN LIBERTAD\n```",
          })
          .addFields({
            name: "🔓 Liberado por",
            value: `<@${i.user.id}> a <t:${Math.floor(Date.now() / 1000)}:T>`,
          });

        const btnsOff = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("l1").setLabel("✅ Liberado").setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId("l2").setLabel("⏰ Extender").setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId("l3").setLabel("📂 Expediente").setStyle(ButtonStyle.Primary).setDisabled(true)
        );

        await msg.edit({ embeds: [embedFin], components: [btnsOff] });
        await i.reply({ content: `✅ **${nombreCiudadano}** ha sido liberado.` });
        log("ARRESTO", "Ciudadano liberado", i.user.tag, nombreCiudadano);
      }

      if (i.customId === `arr_extender_${arrestoId}`) {
        if (!i.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
          return i.reply({ content: "❌ Sin permisos.", ephemeral: true });
        }
        const arr = getArrestos();
        if (arr[arrestoId]) {
          arr[arrestoId].tiempo += 15;
          saveArrestos(arr);
        }
        await i.reply({
          content: `⏰ Tiempo de detención extendido **15 minutos** adicionales para **${nombreCiudadano}**.`,
          ephemeral: true,
        });
      }

      if (i.customId === `arr_ficha_${arrestoId}`) {
        const expKey = `exp_${ciudadano.id}`;
        const exps = db.loadDB("vehiculos");
        const ficha = exps[expKey] || { arrestos: [], multas: [] };
        await i.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle(`📂 EXPEDIENTE POLICIAL — ${nombreCiudadano}`)
              .addFields(
                { name: "🚔 Arrestos", value: `**${ficha.arrestos?.length || 0}** registros`, inline: true },
                { name: "💸 Multas", value: `**${ficha.multas?.length || 0}** registros`, inline: true }
              )
              .setTimestamp()
              .setFooter({ text: "🏙️ Departamento de Policía RP" }),
          ],
          ephemeral: true,
        });
      }
    });
  },
};
