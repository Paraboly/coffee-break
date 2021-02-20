import {Entity, Column, Index, PrimaryColumn, PrimaryGeneratedColumn, ManyToOne} from "typeorm";
import { DiscordServer } from '../../client/model';


@Entity({ name: "match_schedule" })
class MatchSchedule {
    
    @Column()
    serverId: string;

    @Column({ name: "schedule_cron" })
    scheduleCron: string;

    @Column({ name: "match_size" })
    matchSize: number;

    @Column({ name: "poll_match_interval" })
    pollMatchInterval: number;

    @PrimaryGeneratedColumn({ name: "schedule_id" })
    scheduleId: string;
    
    @ManyToOne(type => DiscordServer, server => server.matchHistory)
    server: DiscordServer;

    @Column({ name: "invite_text" })
    inviteText: string;

    @Column()
    emoji: string;
}

export { MatchSchedule };
