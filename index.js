// Require the necessary discord.js classes
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { token, prefix } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

// Create a new client instance ----------------------------
const client = new Client({
	partials: [
		Partials.Channel, // for text channel
		Partials.GuildMember, // for guild member
		Partials.User, // for discord user
	],
	intents: [
		GatewayIntentBits.Guilds, // for guild related things
		GatewayIntentBits.GuildMembers, // for guild members related things
		GatewayIntentBits.GuildIntegrations, // for discord Integrations
		GatewayIntentBits.GuildVoiceStates, // for voice related things
		GatewayIntentBits.MessageContent, // for message content
		GatewayIntentBits.DirectMessages, // for direct messages
		GatewayIntentBits.GuildMessages, // for guild messages
	],
});

// Commands ------------------------------------------------
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	client.commands.set(command.data.name, command);
}

// Events --------------------------------------------------
// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log(`Ready! Logged in as bot ${client.user.tag}`);
});

client.once('reconnecting', () => {
	console.log('Reconnecting!');
});

client.once('disconnect', () => {
	console.log('Disconnect!');
});

// Interaction ---------------------------------------------
client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;
	console.log(`user ${interaction.user.tag} in channel #${interaction.channel.name} triggered an interaction.`);

	const command = client.commands.get(interaction.commandName);
	if (!command) return;
	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

// Messages ------------------------------------------------
client.on('messageCreate', async message => {
	if (message.author.bot) return;
	if (!message.content.startsWith(prefix)) return;
	console.log(`user ${message.author.tag} in channel #${message.channel.name} sent a message\n${message.content}`);

	// play music
	if (message.content.startsWith(`${prefix}play`)) {
		// execute(message, serverQueue);
		await message.reply(`play: ${message.content.split(' ')[1]}`);
		return;
	}

	// stop music
	if (message.content.startsWith(`${prefix}stop`)) {
		// execute(message, serverQueue);
		await message.reply(`stop: ${1}`);
		return;
	}

	// skip music
	if (message.content.startsWith(`${prefix}skip`)) {
		// execute(message, serverQueue);
		await message.reply(`skip: ${1}`);
		return;
	}

	// another command
	if (message.content.startsWith(`${prefix}`)) {
		const ServerMessage = message.content.split(' ')[1];
		let AnsewerMessage = '';
		switch (ServerMessage.toLowerCase()) {
		case 'hi':
			AnsewerMessage = `Hello ${message.author.username}!`;
			break;
		default:
			AnsewerMessage = `I don't understand you! ${message.author.username}`;
			break;
		}
		await message.reply(`${AnsewerMessage}`);
	}
});

// Login to Discord with your client's token ---------------
client.login(token);