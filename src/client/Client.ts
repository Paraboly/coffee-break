import Discord from 'discord.js';
import { getRepository } from 'typeorm';

import { DiscordServer } from './model';
import { chatMatchService } from '../chat_match/service';

/**
 * Features;
 * -------------------
 * Selecting people that goes to the office the next day
 * 
 * Making people collabrate by picking random people for chatting
 */
export class CoffeeBreak {
    client: Discord.Client;
    static _instance: CoffeeBreak;

    constructor() {
        if (CoffeeBreak._instance) {
            return CoffeeBreak._instance;
        }
        CoffeeBreak._instance = this;

        const discordToken = process.env.DISCORD_TOKEN;
        const client = new Discord.Client();
        client.login(discordToken);

        this.client = client;

        return CoffeeBreak._instance;
    }

    public getClient() {
        return this.client;
    }

    public async run() {
        
        setTimeout(() => {
            console.log("Starting");    
            this.client.on("message", this.messageListener);
        }, 1000);
    }

    public async messageListener(msg: Discord.Message) {
        const discordClient = new CoffeeBreak().client;
        const guildId = msg.guild.id;

        if (msg.author.id === discordClient.user.id) return;
        if (!msg.mentions.has(discordClient.user)) return;

        if (msg.content.includes("schedule:")) {
            const response = await chatMatchService.addSchedule(guildId, msg.content, msg.channel.id);
            msg.reply(response);
        }
    }
}