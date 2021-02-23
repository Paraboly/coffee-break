import { getRepository } from 'typeorm';
import { isValidCron } from 'cron-validator';
import Discord from 'discord.js';
import { chain, chunk, shuffle } from 'lodash';
import { format } from 'date-fns';

import { MatchSchedule } from './entities/MatchSchedule.entity';
import Scheduler, { scheduler } from '../scheduler';
import events from '../utils/events';
import { CoffeeBreak } from '../client/Client';
import { DiscordServer } from '../client/model';
import randomName from '../utils/name-generator';
import { MatchHistory, matchHistoryHandler } from './entities/MatchHistory.entity';
import { MatchPolls, matchPollsHandler } from './entities/MatchPolls.entity';
import parseCommand from '../utils/command-parser';

class ChatMatchService {
    async addSchedule(guildId: string, msgContent: string, channelId: string): Promise<string> {
        const cronRegex = /schedule:set\((.*?)\)/;
        const sizeRegex = /schedule:group_size\((.*?)\)/;
        const intervalRegex = /schedule:interval\((.*?)\)/;
        const deleteRegex = /schedule:delete\((.*?)\)/;
        const inviteTextRegex = /schedule:text\((.*?)\)/;
        const emojiRegex = /schedule:emoji\((.)\)/;

        const cron = cronRegex.exec(msgContent)?.[1];
        const size = sizeRegex.exec(msgContent)?.[1];
        const interval = intervalRegex.exec(msgContent)?.[1];
        const removedId = deleteRegex.exec(msgContent)?.[1];
        const inviteText = inviteTextRegex.exec(msgContent)?.[1];
        const emoji = emojiRegex.exec(msgContent)?.[1];

        if (removedId) {
            const schedule = await getRepository(MatchSchedule).findOne({ 
                serverId: guildId,
                scheduleId: removedId
            });
            await getRepository(MatchSchedule).remove(schedule);
            Scheduler.removeJob(removedId);
            return "Removed schedule";
        } else if (
            cron
            && !isValidCron(cron)) {
            console.log("non valid cron");
            return "Wrong cron format";
        } else if (
            cron
            && isValidCron(cron)
            && size
            && interval
            && inviteText
            && emoji
        ) {
            const newSchedule = new MatchSchedule();
            newSchedule.matchSize = parseInt(size);
            newSchedule.pollMatchInterval = parseInt(interval);
            newSchedule.scheduleCron = cron;
            newSchedule.serverId = guildId;
            newSchedule.inviteText = inviteText;
            newSchedule.emoji = emoji;

            await getRepository(MatchSchedule).save(newSchedule);
            getRepository(DiscordServer)
                .findOne({ id: guildId })
                .then(discordServer => {
                    discordServer.defaultChannel = channelId;
                    getRepository(DiscordServer).save(discordServer);
                });
            Scheduler.addCron(cron, newSchedule.scheduleId, () => {
                events.emit("START_POLL", newSchedule);
            });
            return `Cron set succesfuly with id ${newSchedule.scheduleId}`;
        } else {
            return "something went wrong";
        }
    }

    async migrateDbToScheduler() {
        const schedules = await getRepository(MatchSchedule).find({});
        schedules.forEach(schedule => {
            Scheduler.addCron(schedule.scheduleCron, schedule.scheduleId, () => {
                events.emit("START_POLL", schedule);
            });
        });
    }

    async startPoll(schedule: MatchSchedule) {
        const self = this;

        const coffeBreak = new CoffeeBreak();
        const serverData = await getRepository(DiscordServer).findOne({ id: schedule.serverId });

        const guild = await coffeBreak
            .getClient().guilds
            .fetch(serverData.id)

        const channel = guild.channels.cache.find(channel => channel.id === serverData.defaultChannel);

        await self.deleteOldRooms(guild);
        
        (channel as Discord.TextChannel)
            .send(`${schedule.inviteText} @here`)
            .then(async msg => {
                await msg.react(schedule.emoji);
                const reactionFilter = (reaction, user) =>  {
                    return reaction.emoji.name === schedule.emoji;
                };

                const awaitTime = schedule.pollMatchInterval * 1000 * 60;
                // const awaitTime = 10 * 1000;
                msg.awaitReactions(reactionFilter, { time: awaitTime })
                    .then(async (reactions) => {
                        const attendeeList = reactions
                            .get(schedule.emoji)?.users?.cache
                            ?.filter(user => user.id !== coffeBreak.client.user.id)
                            ?.map(u => u);
                        if (!attendeeList) return;
                        this.savePoll(attendeeList, guild.id);

                        msg.channel
                            .send(`${attendeeList.reduce((acc, curr) => acc + ` <@${curr.id}>`, '')} have reacted. Matching people now`);
                        
                        const matchList = self.matchUsers(attendeeList, schedule.matchSize);

                        const parentRoom = await this.createParentRoom(guild);
                        for (const matchedGroup of matchList) {
                            await self.createRoom(matchedGroup, guild, parentRoom);
                        }
                    })
                    .catch(err => {
                        console.error("error => ", err);
                    });
            });
    }

    private matchUsers(attendeeList: Discord.User[], groupSize: number): Discord.User[][] {
        const matches = chain(attendeeList)
            .shuffle()
            .chunk(groupSize)
            .value();
        return matches;
    }

    private async createParentRoom(guild: Discord.Guild): Promise<Discord.CategoryChannel> {
        const parentRoom = await guild.channels.create(`${format(new Date(), 'yyyy/MM/dd')}-chat-group`, {
            type: 'category'
        });
        return (parentRoom as Discord.CategoryChannel);
    }

    private async createRoom(attendees: Discord.User[], guild: Discord.Guild, parentRoom: Discord.CategoryChannel) {
        const everyoneRole = guild.roles.cache.find(role => role.name === '@everyone');

        const newChannel = await guild.channels.create(randomName(), {
            type: "text",
            permissionOverwrites: [
                {
                    id: everyoneRole.id,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: guild.client.user.id,
                    allow: ['MANAGE_CHANNELS', 'VIEW_CHANNEL']
                },
                ...attendees.map(user => {
                    return ({
                        id: user.id,
                        allow: ['VIEW_CHANNEL', 'ADD_REACTIONS', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                    } as Discord.OverwriteResolvable);
                })
            ],
            parent: parentRoom
        });

        const newVoiceChannel = await guild.channels.create(randomName(), {
            type: "voice",
            permissionOverwrites: [
                {
                    id: everyoneRole.id,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: guild.client.user.id,
                    allow: ['MANAGE_CHANNELS', 'VIEW_CHANNEL']
                },
                ...attendees.map(user => {
                    return ({
                        id: user.id,
                        allow: ['VIEW_CHANNEL', 'CONNECT', 'SPEAK']
                    } as Discord.OverwriteResolvable);
                })
            ],
            parent: parentRoom
        });

        await newChannel.send(`You are matched! Plan your virtual chat, and start talking. You can ask your friend about the challanges they faced in last few weeks, ` +
            `or any new hobbies that they are getting into.`);
        await newChannel.send(`${attendees.reduce((acc, curr) => acc + ` <@${curr.id}>`, '')}`);
        
        const newHistoryData = new Proxy(new MatchHistory(), matchHistoryHandler);
        newHistoryData.channelId = newChannel.id;
        newHistoryData.voiceChannelId = newVoiceChannel.id;
        newHistoryData.matchDate = new Date();
        // @ts-ignore: Arrays are implicitly cast to string
        newHistoryData.matchedUsers = attendees.map(att => att.id);
        newHistoryData.serverId = guild.id;
        newHistoryData.parentGroup = parentRoom.id;
        getRepository(MatchHistory).save(newHistoryData);
    }

    private async savePoll(attendees: Discord.User[], serverId: string) {
        const matchPoll = new Proxy(new MatchPolls(), matchPollsHandler);
        matchPoll.serverId = serverId;
        matchPoll.pollDate = new Date();
        // @ts-ignore: Implicit conversion is done
        matchPoll.attendees = attendees.map(user => user.id);
        getRepository(MatchPolls).save(matchPoll);
    }

    private async deleteOldRooms(guild: Discord.Guild) {
        const historyList = await getRepository(MatchHistory).find({
            serverId: guild.id,
            deletedChannel: false,
        });
        const parentId = historyList?.[0]?.parentGroup;
        await guild.channels.cache.find(ch => ch.id === parentId)?.delete();
        for (const history of historyList) {
            await guild.channels.cache.find(ch => ch.id === history.channelId)?.delete();
            await guild.channels.cache.find(ch => ch.id === history.voiceChannelId)?.delete();
            history.deletedChannel = true;
            getRepository(MatchHistory).save(history);
        }
    }
}

const chatMatchService = new ChatMatchService();

export { chatMatchService };