// Imports
const send = require("./send.js");
const mongoose = require("mongoose");
const { Schema } = mongoose;
log = console.log;
require("dotenv").config();

// Connects to database
const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Connects to agenda
const Agenda = require("agenda");
const agenda = new Agenda({ db: { address: MONGO_URL } });

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

// Uncomment this if you want queue data to be wiped on startup
// deleteAll();

const getUnix = () => {
    return Math.round(new Date().getTime() / 1000);
};

const rlRequests = 1; // Amount of requests that can be send before ratelimit (dependent on rlSeconds)
const rlSeconds = 2; // In how many seconds said requests have to be sent

module.exports = function (app) {
    app.get("/", function (req, res) {
        log("Got request to homepage");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ message: "Hello World!" }));
    });

    app.post("/api/webhooks/:server/:webhook", async function (req, res) {
        const identifier = `${req.params.server}/${req.params.webhook}`;
        const webhookUrl = `https://discord.com/api/webhooks/${identifier}`;
        const hookBody = req.body;

        // Status of the current webhook (queued or sent)
        // sent - will be sent instantly
        // queued - will be sent after passes queue
        var status;
        // Miliseconds left until webhook will be sent
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

        async function fullSend(type) {
            const response = await send.sendWebhook(webhookUrl, hookBody);
            if (response.status !== 204) {
                log(`Status code: ${response.status} on ${type} webhook`);
            }
            const date = getUnix();
            await Queue.updateOne(
                { identifier: identifier },
                { lastUpdated: date, $inc: { queuedCount: -1 } }
            );
        }

        agenda.define("fullSend", async (job) => {
            await fullSend("queued");
        });

        // Sends webhook to discord if allowed
        if (status === "sent") {
            secondsLeft = 0;
            await Queue.updateOne({ identifier: identifier }, { $inc: { queuedCount: 1 } });
            await fullSend("normal");
        } else {
            // If request got queue'd
            await Queue.updateOne({ identifier: identifier }, { $inc: { queuedCount: 1 } });

            // Could maybe be removed, just trying to get as minimal latency as possible
            const idfresn = await Queue.findOne({
                identifier: identifier,
            }).exec();

            const queuedCount = idfresn.queuedCount;

            // Calculates how much time is left until webhook should be sent
            let seconds = Math.round(queuedCount / rlRequests) * rlSeconds;
            seconds = Math.abs(seconds);
            if (seconds === 0) seconds = rlSeconds;
            secondsLeft = seconds;

            await agenda.start();
            await agenda.schedule(`in ${seconds} seconds`, "fullSend");
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
