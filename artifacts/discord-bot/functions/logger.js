const fs = require("fs");
const path = require("path");
const db = require("../database/db");

const LOGS_DIR = path.join(__dirname, "../logs");

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function getTimestamp() {
  return new Date().toLocaleString("es-ES", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function log(tipo, accion, usuario, detalle = "") {
  ensureLogsDir();
  const timestamp = getTimestamp();
  const entry = `[${timestamp}] [${tipo.toUpperCase()}] ${accion} | Usuario: ${usuario} | ${detalle}\n`;

  const dateStr = new Date().toISOString().split("T")[0];
  const logFile = path.join(LOGS_DIR, `${dateStr}.log`);
  fs.appendFileSync(logFile, entry);

  const logs = db.loadDB("logs");
  const key = Date.now().toString();
  logs[key] = { timestamp, tipo, accion, usuario, detalle };
  if (Object.keys(logs).length > 500) {
    const oldest = Object.keys(logs).sort()[0];
    delete logs[oldest];
  }
  db.saveDB("logs", logs);
}

function getLogs(limit = 50) {
  const logs = db.getAll("logs");
  return Object.values(logs)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

module.exports = { log, getLogs, getTimestamp };
