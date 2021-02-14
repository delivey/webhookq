const axios = require("axios")
log = console.log

async function sendWebhook(url, data) {
    var response;
    try {
        response = await axios({
            url: url,
            method: "POST",
            headers: {"Content-Type": "application/json"},
            data: JSON.stringify(data)
        })
    } catch (err) {
        response = err.response
    }
    return response
}

/*
async function sendMass(url, count) {
    for (i=0; i < count; ++i) {
        const data = {"content": i}
        const resp = await sendWebhook(url, data)
        log(resp)
        if (resp === 429) {
            log(`Ratelimited after ${i} requests`)
        } else {
            log(`Sent webhook ${i}`)
        }
    }
}
*/

module.exports =  { sendWebhook }