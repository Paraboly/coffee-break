import {Entity, Column, Index, PrimaryColumn, PrimaryGeneratedColumn, ManyToOne, JoinTable} from "typeorm";
import { isArray } from "lodash";
import { DiscordServer } from "../../client/model";


@Entity({ name: "match_history" })
class MatchHistory {
    
    @Column()
    serverId: string;

    @Column({ name: "match_date" })
    matchDate: Date;

    @Column({ name: "matched_users" })
    matchedUsers: string;

    @PrimaryGeneratedColumn({ name: "match_id" })
    matchId: string;

    @ManyToOne(type => DiscordServer, server => server.matchHistory)
    server: DiscordServer;

    @Column({ name: "channel_id" })
    channelId: string;

    @Column({ name: "deleted_channel", default: false })
    deletedChannel: boolean;

    @Column({ name: "parent_group" })
    parentGroup: string;
}

const matchHistoryArrayFields = [
    "matchedUsers"
];

const matchHistoryHandler: ProxyHandler<MatchHistory> = {
    get: (oTarget, sKey) => {
        if (matchHistoryArrayFields.includes(sKey.toString())) {
            return oTarget[sKey].split(",");
        }
        return oTarget[sKey];
    },
    set: (oTarget, sKey, vValue: string[]) => {
        if (matchHistoryArrayFields.includes(sKey.toString())) {
            if (!isArray(vValue)) return false;
            oTarget[sKey] = vValue.join(",");
            return true;
        }
        oTarget[sKey] = vValue
        return true;
    }
}

export {MatchHistory, matchHistoryHandler};
