// Imports
const send = require("./send.js")
const mongoose = require("mongoose")
const { Schema } = mongoose;
log = console.log
require('dotenv').config();

// Connects to database
const MONGO_URL = process.env.MONGO_URL
mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

// Creates the model and schema for the queue object
const queueSchemaObj = {
    identifier: String,
    queuedCount: {
        type: Number,
        default: 0
    },
    ratelimitLeft: {
        type: Number,
        default: 5
    },
    // Unix time of when queue was last updated
    lastUpdated: {
        type: Number,
        default: 0
    }
}

const queueSchema = new Schema(queueSchemaObj)
const Queue = mongoose.model('Queue', queueSchema);

// Function for deleting everything from the database
async function deleteAll() {
    await Queue.deleteMany({}).exec();
}

deleteAll()

const getUnix = () => {
    return Math.round((new Date()).getTime() / 1000);
}

const rlRequests = 5 // Amount of requests that can be send before ratelimit (dependent on rlSeconds)
const rlSeconds = 2 // In how many seconds said requests have to be sent

module.exports = function(app){

    app.get("/", function(req, res){
        log("Got request to homepage")
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ "message": "Hello World!" }));
    });

    app.post("/api/webhooks/:server/:webhook", async function (req, res) {

        const identifier = `${req.params.server}/${req.params.webhook}`
        const webhookUrl = `https://discord.com/api/webhooks/${identifier}`
        const hookBody = req.body

        // Status of the current webhook (queued or sent)
        // sent - will be sent instantly
        // queued - will be sent after passes queue
        var status;
        // Miliseconds left until webhook will be sent
        var milisecondsLeft = 42069;

        // Checks if webhook exists in the database
        var hookExists = true;
        const idfres = await Queue.findOne({ identifier: identifier }).exec();
        if (idfres === null) hookExists = false;
        else log(idfres.ratelimitLeft)

        // If webhook isn't in the database
        if (!hookExists) {
            await Queue.create({ identifier: identifier })
            status = "sent"
        } else {
            const date = getUnix()
            // Checks if last webhook was sent more than 2 seconds ago
            if (date - idfres.lastUpdated >= rlSeconds) {
                // Resets left requests and updates date
                await Queue.updateOne({ identifier: identifier }, { ratelimitLeft: 5, lastUpdated: date });
                status = "sent"
            } else {
                if (idfres.ratelimitLeft > 0) status = "sent";
                else status = "queued"
            }
        }

        // Sends webhook to discord if allowed
        if (status === "sent") {
            const response = await send.sendWebhook(webhookUrl, hookBody)
            const reqsLeft = Number(response.headers["x-ratelimit-remaining"])
            // const resetAfter = response.headers["x-ratelimit-reset-after"]
            const date = getUnix()
            await Queue.updateOne({ identifier: identifier }, { ratelimitLeft: reqsLeft, lastUpdated: date });
        } else {
            // If request got queue'd
            // TODO
        }

        // Constructs the response
        var respObj = {
            "status": status,
            "milisecondsLeft": milisecondsLeft
        };

        res.end(JSON.stringify(respObj));
    })
}