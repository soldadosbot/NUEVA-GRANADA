const express = require("express");
const path = require("path");
const db = require("../database/db");
const { getLogs } = require("../functions/logger");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API endpoints
app.get("/api/stats", (req, res) => {
  const cedulas = db.getAll("cedulas");
  const vehiculos = db.getAll("vehiculos");
  const licencias = db.getAll("licencias");
  const banco = db.getAll("banco");
  const servidor = db.loadDB("servidor");
  const votaciones = db.getAll("votaciones");

  const totalDinero = Object.values(banco).reduce(
    (acc, c) => acc + (c.efectivo || 0) + (c.banco || 0),
    0
  );

  res.json({
    servidor: servidor.estado || "cerrado",
    totalUsuarios: Object.keys(cedulas).length,
    totalVehiculos: Object.keys(vehiculos).length,
    totalLicencias: Object.keys(licencias).length,
    totalDineroCirculacion: totalDinero,
    totalVotaciones: Object.keys(votaciones).length,
    jugadores: servidor.jugadores || 0,
    ultimaApertura: servidor.ultimaApertura,
    ultimoCierre: servidor.ultimoCierre,
  });
});

app.get("/api/usuarios", (req, res) => {
  const cedulas = db.getAll("cedulas");
  const banco = db.getAll("banco");
  const licencias = db.getAll("licencias");
  const vehiculos = db.getAll("vehiculos");

  const usuarios = Object.values(cedulas).map((c) => {
    const b = banco[c.userId] || { efectivo: 0, banco: 0 };
    const lic = licencias[c.userId];
    const vehs = Object.values(vehiculos).filter((v) => v.userId === c.userId);
    return {
      discordId: c.discordId,
      discordTag: c.discordTag,
      nombre: `${c.nombre} ${c.apellido}`,
      cedula: c.numeroCedula,
      edad: c.edad,
      nacionalidad: c.nacionalidad,
      efectivo: b.efectivo,
      banco: b.banco,
      total: (b.efectivo || 0) + (b.banco || 0),
      licencia: lic ? lic.categoria : null,
      vehiculos: vehs.length,
      avatar: c.avatarURL,
    };
  });

  res.json(usuarios.sort((a, b) => b.total - a.total));
});

app.get("/api/banco", (req, res) => {
  const banco = db.getAll("banco");
  const cedulas = db.getAll("cedulas");
  const ranking = Object.values(banco)
    .map((c) => {
      const ced = cedulas[c.userId];
      return {
        userId: c.userId,
        nombre: ced ? `${ced.nombre} ${ced.apellido}` : "Sin cédula",
        efectivo: c.efectivo || 0,
        banco: c.banco || 0,
        total: (c.efectivo || 0) + (c.banco || 0),
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);
  res.json(ranking);
});

app.get("/api/vehiculos", (req, res) => {
  const vehiculos = db.getAll("vehiculos");
  res.json(Object.values(vehiculos));
});

app.get("/api/licencias", (req, res) => {
  const licencias = db.getAll("licencias");
  res.json(Object.values(licencias));
});

app.get("/api/logs", (req, res) => {
  const logs = getLogs(100);
  res.json(logs);
});

app.get("/api/servidor", (req, res) => {
  res.json(db.loadDB("servidor"));
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
