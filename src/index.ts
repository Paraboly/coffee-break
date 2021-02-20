require('dotenv').config();

import { CoffeeBreak } from "./client/Client";
require('./db/connection');
import { chatMatchService } from './chat_match/service';
import events from './utils/events';

const coffeBreakInstance = new CoffeeBreak();

setTimeout(() => {
    coffeBreakInstance.run();
    chatMatchService.migrateDbToScheduler();
    events.on("START_POLL", chatMatchService.startPoll);
}, 1000);


