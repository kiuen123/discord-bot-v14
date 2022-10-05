const ytdl = require("ytdl-core");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");

const play = async (connect, song) => {
    let player = createAudioPlayer();
    let stream = createAudioResource(ytdl(song, { filter: "audioonly" }));
    player.play(stream);

    // state change
    player.on("stateChange", (oldState, newState) => {
        console.log(`Player transitioned from ${oldState.status} to ${newState.status}`);
    });

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
