import {Entity, Column, PrimaryColumn, OneToMany, JoinTable, ManyToMany, PrimaryGeneratedColumn} from "typeorm";

import { MatchHistory } from '../chat_match/entities/MatchHistory.entity';
import { MatchPolls } from "../chat_match/entities/MatchPolls.entity";
import { MatchSchedule } from "../chat_match/entities/MatchSchedule.entity";


@Entity({ name: "discord_servers" })
export class DiscordServer {
    @PrimaryColumn()
    id: string;    

    @Column({ name: "first_seen_date" })
    firstSeenDate: Date;

    @Column({ name: "default_channel" })
    defaultChannel: string;

    @OneToMany(type => MatchHistory, history => history.server, {
        eager: true
    })
    matchHistory: MatchHistory[];

    @OneToMany(type => MatchPolls, polls => polls.server, {
        eager: true
    })
    matchPolls: MatchPolls[];

    @OneToMany(type => MatchSchedule, schedule => schedule.server, {
        eager: true,
        cascade: true,
    })
    matchSchedule: MatchSchedule[];
}
