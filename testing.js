const ratelimit = require("./ratelimit.js");
const send = require("./send.js");

const webhookUrl = "https://discord.com/api/webhooks/797465931264950283/tnN6ykJRx5doOe2UCF4w7hy-rJmuBq-1ZiWC6NSBonNO4irQvkE1aKRERTjzC3RJIMz0"
const data = {"content": "test"}

send.sendMass(webhookUrl, 100)