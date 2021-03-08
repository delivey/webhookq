# Benchmarks queued discord requests
# Server must be running for it to work
import requests
from dotenv import load_dotenv
import os
import threading
load_dotenv()

class Benchmark:

    def get_webhook_url(self):

        original_url = os.getenv("TEST_WEBHOOK_URL")
        server_url = os.getenv("SERVER_URL")
        webhook_url = original_url.replace("https://discordapp.com", server_url)

        return webhook_url

    def __init__(self):
        self.requests_total = 0
        self.requests_sent = 0
        self.webhook_url = self.get_webhook_url()

    # Sends a webhook with benchmark content
    def send_webhook(self, number=0):
        data = {
            "content": f"TEST {number}"
        }
        r = requests.post(self.webhook_url, json=data)
        self.requests_sent += 1
        return r

    # Sends x webhooks
    def run_one(self, x):
        for i in range(1, x+1):
            self.requests_total += 1
            r = self.send_webhook(i)
            data = r.json()
            print(f"Sent request {i}. Status: {data['status']}. Seconds left: {data['secondsLeft']}")

benchmark = Benchmark()

run_one = benchmark.run_one

threads = []

for i in range(1):
    t = threading.Thread(target=run_one, args=(20,))
    t.start()
    threads.append(t)