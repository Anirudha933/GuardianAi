# GuardianAI

GuardianAI is an AI-powered system that detects dark patterns in websites and Terms of Service, and continuously monitors them for changes.

---

## 🚀 Features

* 🔍 **Website Scraping** using Playwright + fallback (axios)
* 📜 **ToS Analysis** using LLMs
* 🧠 **Dark Pattern Detection**
* 🤖 **AI-based Response Generation**
* 🔁 **Continuous Monitoring (Heartbeat System)**
* 📌 **Watchlist for tracking websites**
* 🔄 **Change Detection (Diff System)**
* 📚 **Research Augmentation (ArXiv API)**

---

## ⚙️ Pipeline

scrape → analyseTos → detectPatterns → generateResponse

---

## 🧪 Phase 7 Enhancements

### ✅ Watchlist System

* Stores URLs in `memory/watchlist.json`
* Supports adding/removing tracked websites

### ✅ Heartbeat Monitoring

* Automatically rescans all watchlist URLs every cycle
* (Demo uses 60 seconds instead of weekly)

### ✅ Change Detection

* Compares previous vs current results
* Detects meaningful changes (based on patterns only)
* Avoids false positives from LLM variability

### ✅ Research Integration

* Fetches related academic research from ArXiv
* Triggered only when changes are detected

---

## 📊 Performance Testing

### Concurrent Load Test

* 3 users
* P95 latency ≈ **5.3 seconds**
* Stable under controlled load

### Sequential Test (Single User)

* Multiple websites scanned sequentially
* Average time: **5–10 seconds per scan**
* No performance degradation

---

## 🛠️ Tech Stack

* **TypeScript (Node.js)**
* **Playwright** (web scraping)
* **Axios** (fallback + API calls)
* **Groq API / LLMs**
* **JSON-based storage (memory layer)**

---

## ▶️ How to Run

### Install dependencies

npm install
npx playwright install chromium

### Run single scan

npx ts-node run.ts https://example.com

### Run Phase 7 system (monitoring)

npx ts-node phase7.ts

---

## 🧠 Design Highlights

* Uses **fallback scraping** for robustness
* Separates **detection logic vs monitoring logic**
* Uses **pattern-based diffing** to avoid noisy updates
* Designed for **real-world continuous monitoring**

---

## ⚠️ Notes

* Some websites may block scraping (handled via fallback)
* LLM outputs may vary slightly — handled via stable diff logic

---

## 🎯 Conclusion

GuardianAI evolves from a static analyzer into a **continuous AI monitoring system**, capable of detecting and tracking dark patterns over time with intelligent change detection.

---

