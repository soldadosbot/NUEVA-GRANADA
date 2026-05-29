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

const INFRACCIONES = {
  velocidad: { label: "Exceso de velocidad", monto: 500 },
  semaforo: { label: "Saltarse semáforo en rojo", monto: 800 },
  alcohol: { label: "Conducción bajo efectos del alcohol", monto: 2000 },
  fuga: { label: "Fuga de la escena", monto: 1500 },
  armas: { label: "Porte ilegal de armas", monto: 3000 },
  agresion: { label: "Agresión a un agente", monto: 2500 },
  vandalismo: { label: "Vandalismo", monto: 1200 },
  otro: { label: "Otra infracción", monto: 300 },
};

function fmt(n) {
  return `$${Number(n).toLocaleString("es-ES")}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("multa")
    .setDescription("💸 Emitir una multa a un ciudadano")
    .addUserOption((o) => o.setName("ciudadano").setDescription("Ciudadano a multar").setRequired(true))
    .addStringOption((o) =>
      o.setName("infraccion")
        .setDescription("Tipo de infracción")
        .setRequired(true)
        .addChoices(
          { name: "🚗 Exceso de velocidad ($500)", value: "velocidad" },
          { name: "🚦 Semáforo en rojo ($800)", value: "semaforo" },
          { name: "🍺 Conducción bajo alcohol ($2,000)", value: "alcohol" },
          { name: "🏃 Fuga de la escena ($1,500)", value: "fuga" },
          { name: "🔫 Porte ilegal de armas ($3,000)", value: "armas" },
          { name: "👊 Agresión a agente ($2,500)", value: "agresion" },
          { name: "🖌️ Vandalismo ($1,200)", value: "vandalismo" },
          { name: "📋 Otra infracción ($300)", value: "otro" }
        )
    )
    .addIntegerOption((o) =>
      o.setName("monto_extra").setDescription("Monto adicional personalizado").setRequired(false).setMinValue(0)
    )
    .addStringOption((o) => o.setName("detalle").setDescription("Detalle adicional").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const ciudadano = interaction.options.getUser("ciudadano");
    const infraccionKey = interaction.options.getString("infraccion");
    const montoExtra = interaction.options.getInteger("monto_extra") || 0;
    const detalle = interaction.options.getString("detalle") || "";
    const infraccion = INFRACCIONES[infraccionKey];
    const montoTotal = infraccion.monto + montoExtra;
    const ahora = new Date();
    const ts = Math.floor(ahora.getTime() / 1000);
    const multaId = `multa_${Date.now()}`;

    const cedula = db.get("cedulas", ciudadano.id);
    const nombreCiudadano = cedula ? `${cedula.nombre} ${cedula.apellido}` : ciudadano.username;
    const numeroCedula = cedula ? cedula.numeroCedula : "Sin cédula";

    // Guardar multa
    const registros = db.loadDB("logs");
    registros[multaId] = {
      tipo: "MULTA",
      multaId,
      ciudadanoId: ciudadano.id,
      ciudadanoTag: ciudadano.tag,
      nombreCiudadano,
      infraccion: infraccion.label,
      monto: montoTotal,
      oficialId: interaction.user.id,
      oficialTag: interaction.user.tag,
      fecha: ahora.toISOString(),
      estado: "pendiente",
      detalle,
    };
    db.saveDB("logs", registros);

    // Registrar en expediente
    const expKey = `exp_${ciudadano.id}`;
    const exps = db.loadDB("vehiculos");
    if (!exps[expKey]) exps[expKey] = { userId: ciudadano.id, arrestos: [], multas: [], notas: [] };
    exps[expKey].multas = exps[expKey].multas || [];
    exps[expKey].multas.push(multaId);
    db.saveDB("vehiculos", exps);

    const embed = new EmbedBuilder()
      .setColor(0xff6b35)
      .setTitle("💸 ━━ MULTA EMITIDA ━━ 💸")
      .setDescription(
        `**┌──────────────────────────────────────────────────┐**\n` +
        `**│  💸  BOLETA DE INFRACCIÓN OFICIAL — TRÁNSITO RP  │**\n` +
        `**└──────────────────────────────────────────────────┘**\n\n` +
        `> *Se ha emitido la siguiente boleta de infracción de tránsito/penal conforme al código RP.*`
      )
      .addFields(
        {
          name: "🪪 Infractor",
          value: `<@${ciudadano.id}>\n**${nombreCiudadano}**\nCédula: \`${numeroCedula}\``,
          inline: true,
        },
        {
          name: "👮 Oficial Emisor",
          value: `<@${interaction.user.id}>`,
          inline: true,
        },
        {
          name: "🆔 N° Boleta",
          value: `\`${multaId.slice(-10).toUpperCase()}\``,
          inline: true,
        },
        {
          name: "🚨 Infracción Cometida",
          value: `> ⚡ **${infraccion.label}**${detalle ? `\n> *${detalle}*` : ""}`,
        },
        {
          name: "💰 Monto Base",
          value: `**${fmt(infraccion.monto)}**`,
          inline: true,
        },
        {
          name: "➕ Monto Adicional",
          value: `**${fmt(montoExtra)}**`,
          inline: true,
        },
        {
          name: "💸 TOTAL A PAGAR",
          value: `\`\`\`fix\n${fmt(montoTotal)}\n\`\`\``,
          inline: true,
        },
        {
          name: "🕐 Fecha Emisión",
          value: `<t:${ts}:F>`,
          inline: true,
        },
        {
          name: "⏳ Vencimiento Pago",
          value: `<t:${ts + 86400 * 7}:R>`,
          inline: true,
        },
        {
          name: "🟠 Estado",
          value: "```fix\n⏳ PENDIENTE DE PAGO\n```",
        }
      )
      .setThumbnail(ciudadano.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp()
      .setFooter({ text: `🏙️ Dirección de Tránsito RP Premium • ${multaId.slice(-8).toUpperCase()}` });

    const botones = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`multa_pagar_${multaId}`)
        .setLabel("✅ Marcar como Pagada")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`multa_anular_${multaId}`)
        .setLabel("🗑️ Anular Multa")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`multa_cobrar_${multaId}`)
        .setLabel("💰 Cobrar del Banco")
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [botones], fetchReply: true });

    // DM al multado
    try {
      await ciudadano.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff6b35)
            .setTitle("💸 HAS RECIBIDO UNA MULTA")
            .setDescription(
              `> El oficial **${interaction.user.username}** te ha emitido una boleta.\n\n` +
              `**Infracción:** *${infraccion.label}*\n**Monto:** **${fmt(montoTotal)}**`
            )
            .setTimestamp()
            .setFooter({ text: "🏙️ Dirección de Tránsito RP" }),
        ],
      });
    } catch {}

    log("MULTA", "Multa emitida", interaction.user.tag, `${nombreCiudadano} | ${infraccion.label} | ${fmt(montoTotal)}`);

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 4 * 60 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (!i.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return i.reply({ content: "❌ Sin permisos.", ephemeral: true });
      }

      if (i.customId === `multa_pagar_${multaId}`) {
        const regs = db.loadDB("logs");
        if (regs[multaId]) { regs[multaId].estado = "pagada"; db.saveDB("logs", regs); }
        collector.stop("pagada");

        await msg.edit({
          embeds: [EmbedBuilder.from(embed).setColor(0x00d26a).setTitle("✅ MULTA PAGADA")
            .spliceFields(embed.data.fields.length - 1, 1, { name: "🟢 Estado", value: "```diff\n+ PAGADA — SALDADA\n```" })],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("p1").setLabel("✅ Pagada").setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId("p2").setLabel("🗑️ Anular").setStyle(ButtonStyle.Danger).setDisabled(true),
            new ButtonBuilder().setCustomId("p3").setLabel("💰 Cobrar").setStyle(ButtonStyle.Primary).setDisabled(true)
          )],
        });
        await i.reply({ content: `✅ Multa de **${nombreCiudadano}** marcada como pagada.` });
        log("MULTA", "Multa pagada", i.user.tag, `${nombreCiudadano} | ${fmt(montoTotal)}`);
      }

      if (i.customId === `multa_anular_${multaId}`) {
        const regs = db.loadDB("logs");
        if (regs[multaId]) { regs[multaId].estado = "anulada"; db.saveDB("logs", regs); }
        collector.stop("anulada");

        await msg.edit({
          embeds: [EmbedBuilder.from(embed).setColor(0x8b949e).setTitle("🗑️ MULTA ANULADA")
            .spliceFields(embed.data.fields.length - 1, 1, { name: "⚫ Estado", value: "```diff\n- ANULADA — SIN EFECTO\n```" })],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("a1").setLabel("✅ Pagada").setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId("a2").setLabel("🗑️ Anulada").setStyle(ButtonStyle.Danger).setDisabled(true),
            new ButtonBuilder().setCustomId("a3").setLabel("💰 Cobrar").setStyle(ButtonStyle.Primary).setDisabled(true)
          )],
        });
        await i.reply({ content: `🗑️ Multa de **${nombreCiudadano}** anulada.`, ephemeral: true });
        log("MULTA", "Multa anulada", i.user.tag, nombreCiudadano);
      }

      if (i.customId === `multa_cobrar_${multaId}`) {
        const cuentaCiudadano = db.get("banco", ciudadano.id);
        if (!cuentaCiudadano) {
          return i.reply({ content: `❌ **${nombreCiudadano}** no tiene cuenta bancaria.`, ephemeral: true });
        }
        const totalDisp = (cuentaCiudadano.efectivo || 0) + (cuentaCiudadano.banco || 0);
        if (totalDisp < montoTotal) {
          return i.reply({
            content: `❌ **${nombreCiudadano}** no tiene fondos suficientes.\nDisponible: **${fmt(totalDisp)}** | Multa: **${fmt(montoTotal)}**`,
            ephemeral: true,
          });
        }

        // Descontar primero del banco, luego del efectivo
        let restante = montoTotal;
        if (cuentaCiudadano.banco >= restante) {
          cuentaCiudadano.banco -= restante;
        } else {
          restante -= cuentaCiudadano.banco;
          cuentaCiudadano.banco = 0;
          cuentaCiudadano.efectivo -= restante;
        }
        cuentaCiudadano.historial = cuentaCiudadano.historial || [];
        cuentaCiudadano.historial.push({
          tipo: "salida",
          descripcion: `💸 Multa cobrada: ${infraccion.label}`,
          cantidad: montoTotal,
          fecha: new Date().toISOString(),
        });
        db.set("banco", ciudadano.id, cuentaCiudadano);

        const regs = db.loadDB("logs");
        if (regs[multaId]) { regs[multaId].estado = "cobrada"; db.saveDB("logs", regs); }
        collector.stop("cobrada");

        await msg.edit({
          embeds: [EmbedBuilder.from(embed).setColor(0x00d26a).setTitle("💰 MULTA COBRADA — DESCONTADA DEL BANCO")
            .spliceFields(embed.data.fields.length - 1, 1, { name: "🟢 Estado", value: "```diff\n+ COBRADA — DESCONTADA AUTOMÁTICAMENTE\n```" })],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("c1").setLabel("✅ Cobrada").setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId("c2").setLabel("🗑️ Anular").setStyle(ButtonStyle.Danger).setDisabled(true),
            new ButtonBuilder().setCustomId("c3").setLabel("💰 Cobrada").setStyle(ButtonStyle.Primary).setDisabled(true)
          )],
        });
        await i.reply({ content: `💰 **${fmt(montoTotal)}** descontados automáticamente de la cuenta de **${nombreCiudadano}**.` });
        log("MULTA", "Multa cobrada del banco", i.user.tag, `${nombreCiudadano} | ${fmt(montoTotal)}`);
      }
    });
  },
};
