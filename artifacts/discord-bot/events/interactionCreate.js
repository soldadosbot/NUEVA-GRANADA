const { EmbedBuilder } = require("discord.js");
const { COLORS } = require("../functions/embeds");
const { log } = require("../functions/logger");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.rojo)
              .setTitle("❌ Comando no encontrado")
              .setDescription(`> El comando \`/${interaction.commandName}\` no existe.`),
          ],
          ephemeral: true,
        });
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[ERROR] Comando /${interaction.commandName}:`, error);
        log("ERROR", `Comando /${interaction.commandName}`, interaction.user.tag, error.message);

        const errorEmbed = new EmbedBuilder()
          .setColor(COLORS.rojo)
          .setTitle("⚠️ Error Interno")
          .setDescription(
            `> Ha ocurrido un error al ejecutar este comando.\n> Por favor intenta nuevamente o contacta al administrador.`
          )
          .setFooter({ text: error.message.slice(0, 100) });

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
      }
    }

    // Botón reglas
    if (interaction.isButton() && interaction.customId === "ver_reglas_apertura") {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.azul)
            .setTitle("📋 REGLAS DEL SERVIDOR")
            .setDescription(
              `**1.** Respeta a todos los jugadores\n` +
              `**2.** Mantén el roleplay en todo momento\n` +
              `**3.** No uses lenguaje ofensivo\n` +
              `**4.** Sigue las instrucciones de los administradores\n` +
              `**5.** No uses hacks o exploits\n` +
              `**6.** Disfruta el juego`
            )
            .setFooter({ text: "🏙️ Sistema RP Premium" }),
        ],
        ephemeral: true,
      });
    }
  },
};
