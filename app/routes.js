// Imports
const send = require("./send.js");
const mongoose = require("mongoose");
const { Schema } = mongoose;
log = console.log;
require("dotenv").config();
const moment = require("moment");

// Connects to database
const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const maxConcurrency = 500;

// Connects to agenda
const Agenda = require("agenda");
const agenda = new Agenda({
    db: {
        address: MONGO_URL,
        maxConcurrency: maxConcurrency,
        lockLimit: 0,
        defaultLockLifetime: 0,
    },
});

// Creates the model and schema for the queue object
const queueSchemaObj = {
    identifier: String,
    queuedCount: {
        type: Number,
        default: 0,
    },
    // Unix time of when queue was last updated
    lastUpdated: {
        type: Number,
        default: 0,
    },
};

const queueSchema = new Schema(queueSchemaObj);
const Queue = mongoose.model("Queue", queueSchema);

// Function for deleting everything from the database
async function deleteAll() {
    await Queue.deleteMany({}).exec();
}

// Comment this out if you don't want queue data to be wiped on startup
deleteAll();

const getUnix = () => {
    return Math.round(new Date().getTime() / 1000);
};

const rlRequests = 1; // Amount of requests that can be send before ratelimit (dependent on rlSeconds)
const rlSeconds = 2; // In how many seconds said requests have to be sent

async function start_agenda() {
    await agenda.start();
    await agenda.purge();
}

start_agenda();

// If request got queue'd
async function queue_req(identifier, hookBody) {
    await Queue.updateOne({ identifier: identifier }, { $inc: { queuedCount: 1 } });

    // Could be removed, just trying to get as minimal latency as possible
    const idfresn = await Queue.findOne({
        identifier: identifier,
    }).exec();
    const queuedCount = idfresn.queuedCount;

    // Calculates how much time is left until webhook should be sent
    let secondsLeft = Math.round(queuedCount / rlRequests) * rlSeconds;

    // https://github.com/agenda/agenda/issues/824
    const when = moment().add(secondsLeft, "seconds");
    await agenda.schedule(when.toDate(), "fullSend", { hookBody: hookBody, identifier: identifier });

    return secondsLeft
}

module.exports = function (app) {
    app.post("/api/webhooks/:server/:webhook", async function (req, res) {
        const identifier = `${req.params.server}/${req.params.webhook}`;
        const webhookUrl = `https://discord.com/api/webhooks/${identifier}`;
        const hookBody = req.body;

        // Status of the current webhook (queued or sent)
        // sent - will be sent instantly
        // queued - will be sent after passes queue
        var status;
        // Seconds left until webhook will be sent
        var secondsLeft;

        // Checks if webhook exists in the database
        var hookExists = true;
        const idfres = await Queue.findOne({ identifier: identifier }).exec();
        if (idfres === null) hookExists = false;

        // If webhook isn't in the database
        if (!hookExists) {
            await Queue.create({ identifier: identifier });
            status = "sent";
        } else {
            status = "queued";
        }

        async function fullSend(body, identifier) {
            const response = await send.sendWebhook(webhookUrl, body);
            if (response.status !== 204) {
                log(`Status code: ${response.status} on ${type} webhook`);
                await queue_req(identifier, body)
            }
            const date = getUnix();
            await Queue.updateOne(
                { identifier: identifier },
                { lastUpdated: date, $inc: { queuedCount: -1 } }
            );
        }

        agenda.define("fullSend", async (job) => {
            const { hookBody, identifier } = job.attrs.data;
            await fullSend(hookBody, identifier);
            await job.remove();
        });

        // Sends webhook to discord if allowed
        if (status === "sent") {
            secondsLeft = 0;
            await Queue.updateOne({ identifier: identifier }, { $inc: { queuedCount: 1 } });
            await fullSend(hookBody, identifier);
        } else {
            secondsLeft = await queue_req(identifier, hookBody)
        }

        // Constructs the response
        var respObj = {
            status: status,
            secondsLeft: secondsLeft,
        };

        // Sends the response
        res.end(JSON.stringify(respObj));
    });
};
