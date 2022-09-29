// Require the necessary discord.js classes
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const { token, prefix, guildId } = require("./config.json");
const fs = require("node:fs");
const path = require("node:path");
const ytdl = require("ytdl-core");
const {
    joinVoiceChannel,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
} = require("@discordjs/voice");

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
const commandsPath = path.join(__dirname, "slash-commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Events --------------------------------------------------
// When the client is ready, run this code (only once)
client.once("ready", () => {
    console.log(`Ready! Logged in as bot ${client.user.tag}`);
});

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});

// Interaction ---------------------------------------------
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    console.log(`user ${interaction.user.tag} in channel #${interaction.channel.name} triggered an interaction.`);

    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
    }
});

// Music player --------------------------------------------

let resource = [];
let current_song = 0;
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;
    console.log(`user ${message.author.tag} in channel #${message.channel.name} sent a message\n${message.content}`);

    let connection = joinVoiceChannel({
        channelId: "",
        guildId: guildId[1],
        adapterCreator: message.guild.voiceAdapterCreator,
    });

    // play music
    if (message.content.startsWith(`${prefix}play`) || message.content.startsWith(`${prefix}p`)) {
        if (!message.member.voice.channel.id)
            return message.reply("Bạn phải vào voice channel trước khi dùng lệnh này!");
        else {
            connection.channelId = message.member.voice.channel.id;
        }
        // add music to list
        // kiểm tra xem link có hợp lệ không
        check = ytdl.validateURL(message.content.split(" ")[1]);
        if (check) {
            // nếu hợp lệ thì thêm link vào mảng chứa các bài hát
            resource.push(message.content.split(" ")[1]);
            // play music
            connection.on(VoiceConnectionStatus.Ready, async () => {
                await play(connection, resource[current_song]);
            });
        } else {
            // nếu không hợp lệ thì thông báo cho user
            await message.reply(`link không hợp lệ`);
        }
        return;
    }

    // list queue
    if (message.content.startsWith(`${prefix}list`)) {
        await message.reply(`Queue: ${resource.length}`);
        for (let i = 0; i < resource.length; i++) {
            await message.reply(`song ${i}: ${resource[i]}`);
        }
        return;
    }

    // now playing
    if (message.content.startsWith(`${prefix}nowplay`) || message.content.startsWith(`${prefix}np`)) {
        await message.reply(`Now playing song ${current_song} : ${resource[current_song]}`);
        return;
    }

    // next song
    if (message.content.startsWith(`${prefix}next`) || message.content.startsWith(`${prefix}skip`)) {
        await next(connection);
        return;
    }

    // stop music
    if (message.content.startsWith(`${prefix}stop`)) {
        await stop(connection);
        return;
    }

    // another command
    if (message.content.startsWith(`${prefix}`)) {
        const ServerMessage = message.content.split(" ")[1];
        let AnsewerMessage = "";
        switch (ServerMessage.toLowerCase()) {
            case "hi":
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
// play music
const play = async (connect, song) => {
    let player = createAudioPlayer();
    let stream = createAudioResource(ytdl(song, { filter: "audioonly" }));
    player.play(stream);

    // // state change
    // player.on("stateChange", (oldState, newState) => {
    //     console.log(`Player transitioned from ${oldState.status} to ${newState.status}`);
    // });

    // show error
    player.on("error", (error) => {
        console.error(error);
    });

    // play next song
    player.on(AudioPlayerStatus.Idle, async () => {
        if (resource.length > current_song + 1) {
            current_song++;
            await play(connect, resource[current_song]);
        } else {
            console.log("hết nhạc");
            resource = [];
            current_song = 0;
            await connect.destroy();
        }
    });

    // play music
    await connect.subscribe(player);
};
// next song
const next = async (connect) => {
    if (resource.length > current_song + 1) {
        current_song++;
        await play(connect, resource[current_song]);
    } else {
        console.log("hết nhạc");
        resource = [];
        current_song = 0;
        await connect.destroy();
    }
};

const stop = async (connect) => {
    resource = [];
    current_song = 0;
    await connect.destroy();
};

// Login to Discord with your client's token ---------------
client.login(token);
