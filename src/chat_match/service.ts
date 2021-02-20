import { getRepository } from 'typeorm';
import { isValidCron } from 'cron-validator';
import Discord from 'discord.js';

import { MatchSchedule } from './entities/MatchSchedule.entity';
import Scheduler from '../scheduler';
import events from '../utils/events';
import { CoffeeBreak } from '../client/Client';
import { DiscordServer } from '../client/model';

class ChatMatchService {
    async addSchedule(guildId: string, msgContent: string): Promise<string> {
        const cronRegex = /schedule:set\((.*?)\)/;
        const sizeRegex = /schedule:group_size\((.*?)\)/;
        const intervalRegex = /schedule:interval\((.*?)\)/;

        const cron = cronRegex.exec(msgContent)?.[1];
        const size = sizeRegex.exec(msgContent)?.[1];
        const interval = intervalRegex.exec(msgContent)?.[1];

        if (
            cron
            && !isValidCron(cron)) {
            console.log("non valid cron");
            return "Wrong cron format";
        } else if (
            cron
            && isValidCron(cron)
            && size
            && interval
        ) {
            const newSchedule = new MatchSchedule();
            newSchedule.matchSize = parseInt(size);
            newSchedule.pollMatchInterval = parseInt(interval);
            newSchedule.scheduleCron = cron;
            newSchedule.serverId = guildId;
            await getRepository(MatchSchedule).save(newSchedule);
            return "Cron set succesfuly";
        }
    }

    async migrateDbToScheduler() {
        const schedules = await getRepository(MatchSchedule).find({});
        schedules.forEach(schedule => {
            Scheduler.addCron(schedule.scheduleCron, () => {
                events.emit("START_POLL", schedule);
            });
        });
    }

    async startPoll(schedule: MatchSchedule) {
        const coffeBreak = new CoffeeBreak();
        const serverData = await getRepository(DiscordServer).findOne({ id: schedule.serverId });

        let channel = await coffeBreak
            .getClient().guilds
            .fetch(serverData.id)
            .then(guild => guild.channels.cache.find(channel => channel.id === serverData.defaultChannel));
        
        (channel as Discord.TextChannel)
            .send(schedule.inviteText)
            .then(async msg => {
                await msg.react(schedule.emoji);
                const reactionFilter = (reaction, user) =>  {
                    return reaction.emoji.name === schedule.emoji;
                };

                msg.awaitReactions(reactionFilter, { time: schedule.pollMatchInterval * 60 * 1000 })
                    .then((reactions) => {
                        const attendeeList = reactions.get(schedule.emoji).users.cache.filter(user => user.id !== coffeBreak.client.user.id);
                        console.log("reacted users => ", attendeeList);
                        msg.channel.send(`${attendeeList.reduce((acc, curr) => acc + ` <@${curr.id}>`, '')} have reacted. Matching people now`);
                    })
                    .catch(err => {
                        console.error("error => ", err);
                    });
            });
    }
}

const chatMatchService = new ChatMatchService();

export { chatMatchService };