import {Entity, Column, Index, PrimaryColumn, PrimaryGeneratedColumn, ManyToOne} from "typeorm";
import { isArray } from "lodash";
import { DiscordServer } from "../../client/model";


@Entity({ name: "match_polls" })
class MatchPolls {
    
    @Column()
    serverId: string;

    @Column({ name: "poll_date" })
    pollDate: Date;

    @Column({ name: "attendees" })
    attendees: string;

    @PrimaryGeneratedColumn({ name: "match_id" })
    pollId: string;

    @ManyToOne(type => DiscordServer, server => server.matchPolls)
    server: DiscordServer;
}

const matchPollsArrayFields = [
    "attendees"
];

const matchPollsHandler: ProxyHandler<MatchPolls> = {
    get: (oTarget, sKey) => {
        if (matchPollsArrayFields.includes(sKey.toString())) {
            return oTarget[sKey].split(",");
        }
        return oTarget[sKey];
    },
    set: (oTarget, sKey, vValue: string[]) => {
        if (matchPollsArrayFields.includes(sKey.toString())) {
            if (!isArray(vValue)) return false;
            oTarget[sKey] = vValue.join(",");
        }
        return true;
    }
}

export { MatchPolls, matchPollsHandler };
