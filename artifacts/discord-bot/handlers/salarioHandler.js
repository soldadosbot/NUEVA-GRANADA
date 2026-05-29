const cron = require("node-cron");
const db = require("../database/db");
const { log } = require("../functions/logger");
const { EmbedBuilder } = require("discord.js");

const SALARIO_BASE = 2500;
const SALARIO_DIAS = 6;

module.exports = (client) => {
  // Ejecutar cada día a las 12:00 AM
  cron.schedule("0 0 * * *", async () => {
    const cuentas = db.getAll("banco");
    const cedulas = db.getAll("cedulas");
    const ahora = new Date();

    let pagados = 0;

    for (const [userId, cuenta] of Object.entries(cuentas)) {
      const ultimoPago = cuenta.ultimoSalario ? new Date(cuenta.ultimoSalario) : null;
      if (ultimoPago) {
        const diasDesde = (ahora - ultimoPago) / (1000 * 60 * 60 * 24);
        if (diasDesde < SALARIO_DIAS) continue;
      }

      cuenta.banco = (cuenta.banco || 0) + SALARIO_BASE;
      cuenta.ultimoSalario = ahora.toISOString();
      cuenta.historial = cuenta.historial || [];
      cuenta.historial.push({
        tipo: "entrada",
        descripcion: "💼 Salario semanal automático",
        cantidad: SALARIO_BASE,
        fecha: ahora.toISOString(),
      });
      db.set("banco", userId, cuenta);
      pagados++;

      // Intentar DM al usuario
      try {
        const user = await client.users.fetch(userId);
        const cedula = cedulas[userId];
        const nombre = cedula ? `${cedula.nombre} ${cedula.apellido}` : user.username;

        await user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00d26a)
              .setTitle("💼 SALARIO SEMANAL RECIBIDO")
              .setDescription(
                `¡Hola **${nombre}**! Has recibido tu **salario semanal**.\n\n` +
                `> 💰 **Cantidad:** $${SALARIO_BASE.toLocaleString("es-ES")}\n` +
                `> 🏦 **Depositado en:** Cuenta Bancaria\n` +
                `> 📅 **Fecha:** ${ahora.toLocaleDateString("es-ES")}`
              )
              .setTimestamp()
              .setFooter({ text: "🏙️ Sistema RP Premium — Pagos Automáticos" }),
          ],
        });
      } catch {}
    }

    if (pagados > 0) {
      log("SALARIO", "Salarios pagados", "Sistema", `Total pagados: ${pagados} | Monto: $${SALARIO_BASE}`);
      console.log(`[SALARIO] Pagados: ${pagados} usuarios`);
    }
  });

  console.log("[SALARIO] Sistema de salario automático activado (cada 6 días)");
};
