import concurrent.futures
import subprocess
import time

URL = "https://example.com"

def run_test():
    start = time.time()
    subprocess.run(["cmd", "/c", "npx ts-node run.ts " + URL], stdout=subprocess.DEVNULL)
    return time.time() - start

times = []

with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
    futures = [executor.submit(run_test) for _ in range(10)]
    for f in futures:
        times.append(f.result())

times.sort()
p95 = times[int(0.95 * len(times))]

print("Times:", times)
print("P95:", p95)