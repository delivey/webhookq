const send = require("./send.js")
log = console.log

module.exports = function(app){

    app.get("/", function(req, res){
        log("Got request to homepage")
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ "message": "Hello World!" }));
    });

    app.post("/api/webhooks/:server/:webhook", async function (req, res) {

        const webhookUrl = `https://discord.com/api/webhooks/${req.params.server}/${req.params.webhook}`
        const hookBody = req.body

        // Sends webhook to discord
        const response = await send.sendWebhook(webhookUrl, hookBody)

        // Constructs the response
        var respObj;
        if (response.status === 204) {
            respObj = {
                "status": "sent",
                "milisecondsLeft": 0
            }
        } else if (response.status === 429) {
            respObj = {
                "status": "queued",
                "milisecondsLeft": 999
            }
        }

        res.end(JSON.stringify(respObj));
    })
}