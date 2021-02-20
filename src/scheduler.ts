import cron from "cron-scheduler";

export default class Scheduler {
    static addCron(cronString, callback) {
        cron({
            on: cronString,
        }, callback);
    }
}

const scheduler = new Scheduler();

export { scheduler };