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

module.exports =  { sendWebhook }