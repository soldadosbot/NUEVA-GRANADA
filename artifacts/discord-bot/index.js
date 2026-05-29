require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const db = require("./database/db");
const commandHandler = require("./handlers/commandHandler");
const salarioHandler = require("./handlers/salarioHandler");
const webServer = require("./web/server");
const { log } = require("./functions/logger");
const fs = require("fs");
const path = require("path");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANTI-CRASH GLOBAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
process.on("unhandledRejection", (reason, promise) => {
  console.error("[ANTI-CRASH] Unhandled Rejection:", reason);
  log("ERROR", "UnhandledRejection", "Sistema", String(reason));
});

process.on("uncaughtException", (err) => {
  console.error("[ANTI-CRASH] UncaughtException:", err.message);
  log("ERROR", "UncaughtException", "Sistema", err.message);
});

process.on("uncaughtExceptionMonitor", (err) => {
  console.error("[ANTI-CRASH] UncaughtExceptionMonitor:", err.message);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VALIDACIÓN DE VARIABLES DE ENTORNO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const REQUIRED_ENV = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Variables de entorno faltantes: ${missing.join(", ")}`);
  console.error("   Asegúrate de configurarlas en el panel de Replit (Secrets).");
  process.exit(1);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLIENTE DISCORD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

client.commands = new Collection();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INICIALIZAR DB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
db.initAll();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARGAR HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
commandHandler(client);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARGAR EVENTOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`[EVT] Cargado: ${event.name}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INICIAR SERVIDOR WEB (KEEP-ALIVE + DASHBOARD)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PORT = process.env.PORT || 3001;
webServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🌐 Dashboard web activo en puerto ${PORT}`);
  console.log(`   → Para UptimeRobot usa /api/stats`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INICIAR SALARIO AUTOMÁTICO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
salarioHandler(client);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTO-DEPLOY DE COMANDOS AL INICIAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function deployCommands() {
  const { REST, Routes } = require("discord.js");
  const commands = [];
  const commandsPath = path.join(__dirname, "commands");
  const folders = fs.readdirSync(commandsPath);

  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));
    for (const file of files) {
      const cmd = require(path.join(folderPath, file));
      if (cmd.data) commands.push(cmd.data.toJSON());
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log(`✅ ${commands.length} slash commands desplegados en el servidor.`);
  } catch (err) {
    console.error("⚠️ Error desplegando comandos:", err.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOGIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n🚀 Iniciando Bot RP Premium...");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

client.login(process.env.DISCORD_TOKEN).then(async () => {
  await deployCommands();
}).catch((err) => {
  console.error("❌ Error al conectar con Discord:", err.message);
  console.error("   Verifica que el DISCORD_TOKEN sea correcto.");
  process.exit(1);
});
