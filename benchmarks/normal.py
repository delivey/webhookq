# Benchmarks normal discord requests (without queue)
import requests

webhook_url = "https://discord.com/api/webhooks/797465931264950283/tnN6ykJRx5doOe2UCF4w7hy-rJmuBq-1ZiWC6NSBonNO4irQvkE1aKRERTjzC3RJIMz0"

# Amount of requests that should be sent
requests_total = 100
# Ratelimit is 30/60

def send_webhook(number=0):
    data = {
        "content": f"TEST {number}"
    }
    r = requests.post(webhook_url, json=data)
    return r

total_sent = 0



total_failed = 0

successful_status = 204

for i in range(requests_total):
    r = send_webhook(i)
    total_sent += 1
    if r.status_code != successful_status:
        remaining = r.headers["x-ratelimit-remaining"]
        reset_after = r.headers["x-ratelimit-reset-after"]
        # Uncomment line to see innacurate headers provided by discord
        # print(f"Number: {i}, Status: {r.status_code}, Remaining: {remaining}, Reset after: {reset_after} second(s)")
        total_failed += 1
    
print(f"Requests sent: {total_sent}")
print(f"Requests failed: {total_failed}")
print(f"Failed amount: {total_failed}/{total_sent} ({total_failed/total_sent*100}%)")
