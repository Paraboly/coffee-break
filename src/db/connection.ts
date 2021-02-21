import { createConnection, Connection } from "typeorm";
import { MatchHistory } from "../chat_match/entities/MatchHistory.entity";
import { MatchPolls } from "../chat_match/entities/MatchPolls.entity";
import { MatchSchedule } from "../chat_match/entities/MatchSchedule.entity";
import { DiscordServer } from '../client/model';

class DbConnection {
    constructor() {
        createConnection({
            type: "sqlite",
            database: "database.sqlite",
            entities: [DiscordServer, MatchHistory, MatchPolls, MatchSchedule]
        })
        .then(async (connection) => {
            // await connection.synchronize(false);
            console.log("created connection");
        })
        .catch(console.error);
    }
}

const dbConnection = new DbConnection();

export default dbConnection;