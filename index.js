// Require the necessary discord.js classes
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { token, prefix } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const ytdl = require('ytdl-core');

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
const queue = new Map();
client.on('messageCreate', async message => {
	if (message.author.bot) return;
	if (!message.content.startsWith(prefix)) return;
	console.log(`user ${message.author.tag} in channel #${message.channel.name} sent a message\n${message.content}`);
	const serverQueue = queue.get(message.guild.id);

	// play music
	if (message.content.startsWith(`${prefix}play`)) {
		execute(message, serverQueue);
		await message.reply(`play: ${message.content.split(' ')[1]}`);
		return;
	}

	// stop music
	if (message.content.startsWith(`${prefix}stop`)) {
		execute(message, serverQueue);
		await message.reply(`stop: ${1}`);
		return;
	}

	// skip music
	if (message.content.startsWith(`${prefix}skip`)) {
		execute(message, serverQueue);
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
// ---------------------------------------------------------
// cần phải sửa lại đoạn code ở duới này để có thể phát nhạc
// code cũ của chiến lỗi nhiều vì discord.js đã thay đổi
const execute = async (message, serverQueue) => {
	const args = message.content.split(' ');

	const voiceChannel = message.member.voice.channel;
	if (!voiceChannel) {
		return message.channel.send(
			'You need to be in a voice channel to play music!',
		);
	}
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
		return message.channel.send(
			'I need the permissions to join and speak in your voice channel!',
		);
	}

	const songInfo = await ytdl.getInfo(args[1]);
	const song = {
		title: songInfo.videoDetails.title,
		url: songInfo.videoDetails.video_url,
	};

	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true,
		};

		queue.set(message.guild.id, queueContruct);

		queueContruct.songs.push(song);

		try {
			const connection = await voiceChannel.join();
			queueContruct.connection = connection;
			play(message.guild, queueContruct.songs[0]);
		}
		catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	}
	else {
		serverQueue.songs.push(song);
		return message.channel.send(`${song.title} has been added to the queue!`);
	}
};


const skip = (message, serverQueue) => {
	if (!message.member.voice.channel) {
		return message.channel.send(
			'You have to be in a voice channel to stop the music!',
		);
	}
	if (!serverQueue) {return message.channel.send('There is no song that I could skip!');}
	serverQueue.connection.dispatcher.end();
};

const stop = (message, serverQueue) => {
	if (!message.member.voice.channel) {
		return message.channel.send(
			'Vào đây mà bảo Nico ngừng hát nha!',
		);
	}

	if (!serverQueue) {return message.channel.send('Nico có hát bài nào đâu mà dừng');}

	serverQueue.songs = [];
	serverQueue.connection.dispatcher.end();
};


const play = (guild, song) => {
	const serverQueue = queue.get(guild.id);
	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection
		.play(ytdl(song.url))
		.on('finish', () => {
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	serverQueue.textChannel.send(`Nico hát bài: **${song.title}**`);
};


// Login to Discord with your client's token ---------------
client.login(token);