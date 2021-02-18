# webhookq

A queueing system for Discord's webhooks to avoid webhooks failing from ratelimiting.

## Warning

There's an issue with only the first 50-70 jobs or so being scheduled. I'm working on a fix, until then you might experience issues with this queue.

## How to run

1. If you don't have Node.js installed, install it from [here](https://nodejs.org/en/download/)
2. Clone the repository by doing `git clone https://github.com/delivey/webhookq.git`
3. Navigate to the repository's folder: `cd webhookq`
4. Install the required dependencies: `npm i`
5. Put your mongo connection URI, etc in `.env.example` and rename it to `.env`
6. Run `npm start` to start the server.

## How to use

Assuming you're sending webhooks from localhost, and running this server on localhost, in your webhooks, change `https://discord.com` to `http://localhost:8080`. After doing this, all requests will go through the queue and you won't get ratelimited.

## Discord's ratelimits

-   ~~5 requests every 2 seconds~~
-   30 requests every 60 seconds

## Bugs / issues

If you experience any issues or bugs, please open an issue.

## TODO:

-   [ ] Clean the code a bit
