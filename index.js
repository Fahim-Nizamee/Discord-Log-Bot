require("dotenv").config();
const { LocalStorage } = require('node-localstorage');

const keepAlive = require('./server')
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const TOKEN = process.env.TOKEN;
const db = new LocalStorage('./scratch');;

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.content === "!setbeta") {
    const channel = message.channel;
    const channelId = channel.id;
    try {
      await db.setItem(`logChannel_${message.guild.id}`, channelId);
      message.channel.send(`Log channel set to ${channel} successfully.`);
    } catch (error) {
      console.error("Error setting log channel:", error);
      message.channel.send("An error occurred while setting the log channel.");
    }
  }
});

client.on("messageDelete", async (message) => {
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      console.error("Something went wrong when fetching the message:", error);
      return;
    }
  }
  try {
    const logChannelId = await db.getItem(`logChannel_${message.guild.id}`);
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel && logChannel.id !== message.channelId) {
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Message Deleted")
        .addFields(
          { name: "Author", value: `<@${message.author.id}>`, inline: true },
          { name: "Channel", value: message.channel.name, inline: true },
          { name: "Content", value: message.content || "No content" },
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error fetching log channel:", error);
  }
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (oldMessage.partial) {
    try {
      await oldMessage.fetch();
    } catch (error) {
      console.error(
        "Something went wrong when fetching the old message:",
        error,
      );
      return;
    }
  }
  try {
    const logChannelId = await db.getItem(`logChannel_${oldMessage.guild.id}`);
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel && logChannel.id !== oldMessage.channelId) {
      const authorName = oldMessage.author
        ? `<@${oldMessage.author.id}>`
        : "Unknown Author";
      const channelName = oldMessage.channel
        ? oldMessage.channel.name
        : "Unknown Channel";

      const embed = new EmbedBuilder()
        .setColor("#FFFF00")
        .setTitle("Message Edited")
        .addFields(
          { name: "Author", value: authorName, inline: true },
          { name: "Channel", value: channelName, inline: true },
          { name: "Old Content", value: oldMessage.content || "No content" },
          { name: "New Content", value: newMessage.content || "No content" },
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error fetching log channel:", error);
  }
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    const logChannelId = await db.getItem(`logChannel_${newMember.guild.id}`);
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel && logChannel.id !== newMember.guild.systemChannelId) {
      if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
        const oldRoles = oldMember.roles.cache
          .filter((role) => role.name !== "@everyone")
          .map((role) => role.name)
          .join(", ");
        const newRoles = newMember.roles.cache
          .filter((role) => role.name !== "@everyone")
          .map((role) => role.name)
          .join(", ");

        const embed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("Member Roles Updated")
          .addFields(
            { name: "Member", value: `<@${newMember.user.id}>`, inline: true },
            { name: "Old Roles", value: oldRoles || "No roles", inline: true },
            { name: "New Roles", value: newRoles || "No roles", inline: true },
          )
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      }
    }
  } catch (error) {
    console.error("Error fetching log channel:", error);
  }
});

client.on("channelCreate", async (channel) => {
  try {
    const logChannelId = await db.getItem(`logChannel_${channel.guild.id}`);
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel && logChannel.id !== channel.id) {
      const channelType =
        channel.type === "GUILD_VOICE" ? "Voice Channel" : "Text Channel";

      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Channel Created")
        .addFields(
          { name: "Channel Name", value: channel.name },
          { name: "Channel Type", value: channelType },
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error fetching log channel:", error);
  }
});

client.on("channelDelete", async (channel) => {
  try {
    const logChannelId = await db.getItem(`logChannel_${channel.guild.id}`);
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel && logChannel.id !== channel.id) {
      const channelType =
        channel.type === "GUILD_VOICE" ? "Voice Channel" : "Text Channel";

      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Channel Deleted")
        .addFields(
          { name: "Channel Name", value: channel.name },
          { name: "Channel Type", value: channelType },
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error fetching log channel:", error);
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const logChannelId = await db.getItem(`logChannel_${oldState.guild.id}`);
    if (!logChannelId) {
      console.error("Log channel ID not found");
      return;
    }
    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel) {
      console.error("Log channel not found");
      return;
    }
    if (!oldState.channel && newState.channel) {
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Voice Channel Joined")
        .addFields(
          {
            name: "User",
            value: `<@${newState.member.user.id}>`,
            inline: true,
          },
          { name: "Channel", value: newState.channel.name, inline: true },
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    } else if (oldState.channel && !newState.channel) {
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Voice Channel Left")
        .addFields(
          {
            name: "User",
            value: `<@${oldState.member.user.id}>`,
            inline: true,
          },
          { name: "Channel", value: oldState.channel.name, inline: true },
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    } else if (
      oldState.channel &&
      newState.channel &&
      oldState.channel.id !== newState.channel.id
    ) {
      const guild = oldState.guild;
      const fetchedLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: 26, // MEMBER_MOVE
      });
      const moveLog = fetchedLogs.entries.first();

      const embed = new EmbedBuilder()
        .setColor("#FFFF00")
        .setTitle("Voice Channel Moved")
        .addFields(
          {
            name: "User",
            value: `<@${oldState.member.user.id}>`,
            inline: true,
          },
          { name: "From Channel", value: oldState.channel.name, inline: true },
          { name: "To Channel", value: newState.channel.name, inline: true },
        )
        .setTimestamp();

      if (moveLog) {
        const { executor,target} = moveLog;
        
        if (executor.id !== oldState.member.id)
        embed.addFields({
          name: "Moved By",
          value: `<@${executor.id}>`,
          inline: true,
        });
      }

      logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error fetching log channel:", error);
  }
});



keepAlive()
client.login(TOKEN).catch((error) => {
  console.error("Failed to login:", error);
});
