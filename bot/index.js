require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');
const createServer = require('./server');

let restartRequested = false;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = [
  new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Reinicia el servidor de Roblox (expulsa a todos los jugadores).'),
].map((cmd) => cmd.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Registrando el comando /restart...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Comando registrado correctamente.');
  } catch (error) {
    console.error('Error registrando comandos:', error);
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'restart') {
    restartRequested = true;
    await interaction.reply(
      'Solicitud enviada. Roblox expulsará a los jugadores y el servidor se reiniciará en breve.'
    );
    console.log(`Reinicio solicitado por ${interaction.user.tag}`);
  }
});

client.once('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

// --- Arranque ---
(async () => {
  await registerCommands();
  await client.login(process.env.DISCORD_TOKEN);

  const app = createServer(
    () => restartRequested,
    () => { restartRequested = false; }
  );

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor HTTP escuchando en el puerto ${PORT}`);
  });
})();
