const { ActivityType } = require("discord.js");

const ESTADOS = [
  { name: "🏙️ Servidor RP Premium", type: ActivityType.Playing },
  { name: "👮 Patrullando la ciudad", type: ActivityType.Watching },
  { name: "🚗 Tránsito RP", type: ActivityType.Watching },
  { name: "💰 Economía RP activa", type: ActivityType.Playing },
  { name: "🗳️ /votacion para abrir", type: ActivityType.Listening },
  { name: "📋 /perfil para ver tu ficha", type: ActivityType.Listening },
];

let estadoActual = 0;

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`\n✅ Bot conectado como: ${client.user.tag}`);
    console.log(`📡 Servidores: ${client.guilds.cache.size}`);
    console.log(`👥 Usuarios: ${client.users.cache.size}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Estado rotativo cada 30s
    const cambiarEstado = () => {
      const estado = ESTADOS[estadoActual % ESTADOS.length];
      client.user.setActivity(estado.name, { type: estado.type });
      estadoActual++;
    };

    cambiarEstado();
    setInterval(cambiarEstado, 30000);
  },
};
