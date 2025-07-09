// Require the necessary discord.js classes
const { Client, GatewayIntentBits, Partials, Routes } = require("discord.js");
const {
  token,
  prefix,
  youtubeAPIkey,
  clientId,
  listGuildId,
} = require("./config.json");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const search = require("youtube-search");
const ytdl = require("ytdl-core");
const { getInfo } = require("ytdl-getinfo");
const fs = require("fs");
const path = require("node:path");
const { REST } = require("@discordjs/rest");

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
  console.log(
    `user ${interaction.user.tag} in channel #${interaction.channel.name} triggered an interaction.`
  );

  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

// Slash handle --------------------------------------------
const commands = [];
const commandsPath = path.join(__dirname, "slash-commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  commands.push(command.data.toJSON());
}
const rest = new REST({ version: "10" }).setToken(token);
listGuildId.forEach((element) => {
  rest
    .put(Routes.applicationGuildCommands(clientId, element), { body: commands })
    .then((data) =>
      console.log(
        `Successfully registered ${data.length} application commands.`
      )
    )
    .catch(console.error);
});

// Prefix handle -------------------------------------------
// resource to use
let resource = []; // list các bài hát
let current_song = 0; // bài hát hiện tại

// tạo option cho youtube search
let opts = {
  maxResults: 1,
  key: youtubeAPIkey,
};

client.on("messageCreate", async (message) => {
  // nếu là bot thì thoát
  if (message.author.bot) return;
  // nếu không có prefix thì thoát
  if (!message.content.startsWith(prefix)) return;
  // hiển thị lệnh của người dùng
  console.log(
    `user ${message.author.tag} in channel #${message.channel.name} sent a message\n${message.content}`
  );

  // another command
  if (message.content.startsWith(`${prefix} `)) {
    const ServerMessage = message.content.split(" ")[1];
    let AnsewerMessage = "";
    switch (ServerMessage.toLowerCase()) {
      case "hi":
        AnsewerMessage = `Hello ${message.author.username}!`;
        break;
      default:
        AnsewerMessage = `Cái đéo gì thế ${message.author.username}!`;
        break;
    }
    await message.reply(`${AnsewerMessage}`);
    return;
  }

  // tách lệnh
  try {
    // tạo connection
    let connection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.member.voice.channel.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    // join voice channel
    if (
      message.content.startsWith(`${prefix}join`) ||
      message.content.startsWith(`${prefix}j`)
    ) {
      connection.on("error", (error) => {
        console.error(error);
      });
      await message.reply("Đã vào rồi cần gì nói đi");
      return;
    }

    // leave voice channel
    if (
      message.content.startsWith(`${prefix}leave`) ||
      message.content.startsWith(`${prefix}l`)
    ) {
      connection.destroy();
      await message.reply("Some.one out !!!!");
      return;
    }

    // download song
    if (
      message.content.startsWith(`${prefix}download`) ||
      message.content.startsWith(`${prefix}d`)
    ) {
      const url = message.content.split(" ")[1];
      const title = await download(url);
      await message.reply(`Đã tải ${title} vào server`);
      return;
    }

    // play music
    if (
      message.content.startsWith(`${prefix}play`) ||
      message.content.startsWith(`${prefix}p`)
    ) {
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
    if (
      message.content.startsWith(`${prefix}nowplay`) ||
      message.content.startsWith(`${prefix}np`)
    ) {
      await message.reply(
        `Now playing song ${current_song} : ${resource[current_song]}`
      );
      return;
    }

    // next song
    if (
      message.content.startsWith(`${prefix}next`) ||
      message.content.startsWith(`${prefix}skip`)
    ) {
      await next(connection);
      return;
    }

    // stop music
    if (message.content.startsWith(`${prefix}stop`)) {
      await stop(connection);
      return;
    }
  } catch (ex) {
    console.log(ex);
    await message.reply("Có lỗi j đó ở đây. Hmmmmmmmmm!");
  }
});

// Music control--------------------------------------------
// download song
const download = (url) => {
  let title = "";
  getInfo(url).then(async (info) => {
    console.log(info.items[0].title);
    title = info.items[0].title;

    await ytdl(url, { filter: "audioonly" }).pipe(
      fs.createWriteStream(`./resource/${title}.mp3`)
    );
  });

  return title;
};

// play music
const play = async (connect, song) => {
  let player = createAudioPlayer();
  let stream = createAudioResource(ytdl(song, { filter: "audioonly" }));
  player.play(stream);

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

// stop playing
const stop = async (connect) => {
  resource = [];
  current_song = 0;
  await connect.destroy();
};

// Login to Discord with your client's token ---------------
client.login(token);
