const fs = require("fs");
const path = require("path");

const DB_DIR = path.join(__dirname);
const files = {
  usuarios: path.join(DB_DIR, "usuarios.json"),
  cedulas: path.join(DB_DIR, "cedulas.json"),
  vehiculos: path.join(DB_DIR, "vehiculos.json"),
  licencias: path.join(DB_DIR, "licencias.json"),
  banco: path.join(DB_DIR, "banco.json"),
  votaciones: path.join(DB_DIR, "votaciones.json"),
  servidor: path.join(DB_DIR, "servidor.json"),
  logs: path.join(DB_DIR, "logs.json"),
};

function loadDB(key) {
  if (!fs.existsSync(files[key])) {
    fs.writeFileSync(files[key], JSON.stringify({}));
  }
  return JSON.parse(fs.readFileSync(files[key], "utf8"));
}

function saveDB(key, data) {
  fs.writeFileSync(files[key], JSON.stringify(data, null, 2));
}

function get(key, id) {
  const db = loadDB(key);
  return db[id] || null;
}

function set(key, id, data) {
  const db = loadDB(key);
  db[id] = data;
  saveDB(key, db);
}

function getAll(key) {
  return loadDB(key);
}

function remove(key, id) {
  const db = loadDB(key);
  delete db[id];
  saveDB(key, db);
}

function initAll() {
  Object.keys(files).forEach((key) => {
    if (!fs.existsSync(files[key])) {
      const defaults = {
        servidor: {
          estado: "cerrado",
          ultimaApertura: null,
          ultimoCierre: null,
          jugadores: 0,
        },
      };
      fs.writeFileSync(
        files[key],
        JSON.stringify(defaults[key] || {}, null, 2)
      );
    }
  });
}

module.exports = { get, set, getAll, remove, initAll, loadDB, saveDB };
