// Require the necessary discord.js classes
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { token, prefix, guildId, youtubeAPIkey } = require("./config.json");
const ytdl = require("ytdl-core");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const search = require("youtube-search");

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
    // nếu là bot thì thoát
    if (message.author.bot) return;
    // nếu không có prefix thì thoát
    if (!message.content.startsWith(prefix)) return;
    // hiển thị lệnh của người dùng
    console.log(`user ${message.author.tag} in channel #${message.channel.name} sent a message\n${message.content}`);
    // tách lệnh
    try {
        // tạo connection
        let connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: guildId[0],
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        // join voice channel
        if (message.content.startsWith(`${prefix}join`)) {
            await message.reply("Đã vào nói gì nói đi");
            return;
        }

        // play music
        if (message.content.startsWith(`${prefix}play`) || message.content.startsWith(`${prefix}p`)) {
            // add music to list
            // kiểm tra xem link có hợp lệ không
            check = ytdl.validateURL(message.content.split(" ")[1]);
            if (check) {
                // nếu hợp lệ thì thêm link vào mảng chứa các bài hát
                resource.push(message.content.split(" ")[1]);
                // play music
                await play(connection, resource[current_song]);
            } else {
                // nếu không hợp lệ thì tìm kiếm trên youtube
                // tạo option cho youtube search
                let opts = {
                    maxResults: 1,
                    key: youtubeAPIkey,
                };
                // tìm kiếm
                search(message.content.split(" ")[1], opts, async (err, results) => {
                    // nếu có lỗi thì thông báo
                    if (err) return console.log(err);
                    else {
                        // nếu không có lỗi thì thêm link vào mảng chứa các bài hát
                        await message.reply(results[0].title);
                        resource.push(results[0].link);
                        // play music
                        await play(connection, resource[current_song]);
                    }
                });
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
    } catch (ex) {
        await message.reply("Vào phòng nào đó đi rồi gọi");
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
    player.on(AudioPlayerStatus.AutoPaused, async () => {
        player.unpause();
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
