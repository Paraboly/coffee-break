import cron from "cron-scheduler";

interface ICron {
    [cronId: string]: cron;
}

export default class Scheduler {
    static cronsMap: ICron = {};

    static addCron(cronString, cronId, callback) {
        const job = cron({
            on: cronString,
        }, callback);
        this.cronsMap[cronId] = job;
    }

    static removeJob(cronId: string) {
        this.cronsMap[cronId]?.stop();
        delete this.cronsMap[cronId];
    }
}

const scheduler = new Scheduler();

export { scheduler };