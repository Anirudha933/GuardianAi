import subprocess
import time

URLS = [
    "https://example.com",
    "https://wikipedia.org",
    "https://developer.mozilla.org"
]

times = []

for i, url in enumerate(URLS):
    print(f"\nRun {i+1} → {url}")
    start = time.time()

    subprocess.run(
        ["cmd", "/c", "npx ts-node run.ts " + url],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    elapsed = time.time() - start
    times.append(elapsed)
    print(f"Time: {elapsed:.2f}s")

# --- stats ---
times_sorted = sorted(times)
p95 = times_sorted[int(0.95 * len(times_sorted)) - 1]
avg = sum(times) / len(times)

print("\n--- RESULTS ---")
print("Times:", [round(t, 2) for t in times])
print(f"Average: {avg:.2f}s")
print(f"P95: {p95:.2f}s")
print(f"Total time: {sum(times):.2f}s")