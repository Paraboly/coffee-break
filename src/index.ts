require('dotenv').config();

import { CoffeeBreak } from "./client/Client";
require('./db/connection');
import { chatMatchService } from './chat_match/service';
import events from './utils/events';

const coffeBreakInstance = new CoffeeBreak();

// Wait for db connection to initialize before running
setTimeout(() => {
    coffeBreakInstance.run();
    chatMatchService.migrateDbToScheduler();
    events.on("START_POLL", (schedule) => chatMatchService.startPoll(schedule));
}, 1000);


