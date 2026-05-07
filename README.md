# GuardianAI

GuardianAI is an AI-powered system that detects dark patterns in websites and Terms of Service, and continuously monitors them for changes using an automated heartbeat system.

---

## 🚀 Features

* 🔍 Website scraping (Playwright + fallback to axios)
* 📜 AI-based Terms of Service analysis
* 🧠 Dark pattern detection using LLM reasoning
* 🤖 User-friendly risk summarization
* 📌 Watchlist for tracking websites
* 🔁 Heartbeat system for continuous monitoring
* 🔄 Stable change detection (pattern-based diff)
* 📚 Research augmentation using ArXiv API
* 🧪 Modular test system for Phase 7 components

---

## ⚙️ Core Pipeline

scrape → analyseTos → detectPatterns → generateResponse

---

## 🧪 Phase 7 Implementation

### 🔹 Watchlist System

* Stores tracked URLs in `memory/watchlist.json`
* Supports dynamic add/remove operations
* Used as input for continuous monitoring

---

### 🔹 Heartbeat Monitoring

* Automatically rescans watchlist URLs at fixed intervals
* Demonstration interval: **60 seconds** (simulates weekly scans)
* Runs the full AI pipeline autonomously

---

### 🔹 Change Detection (Diff System)

* Compares previous vs current results
* Uses **pattern-based comparison** to avoid LLM noise
* Triggers updates only on meaningful changes

---

### 🔹 Research Augmentation

* Fetches related academic content from ArXiv
* Activated only when changes are detected
* Improves explainability of results

---

## 📊 Performance Testing

### Concurrent Load Test

* 3 concurrent users
* P95 latency ≈ **5.3 seconds**
* Stable execution under constrained resources

---

### Sequential Test (Single User)

* Multiple applications scanned sequentially
* Average latency: **5–10 seconds per scan**
* No degradation across repeated runs

---

## 🧪 Phase 7 Testing

Separate test modules implemented:

* `watchlist.test.ts` → verifies add/remove functionality
* `research.test.ts` → verifies ArXiv API integration
* `heartbeat.test.ts` → verifies continuous monitoring loop

---

## 🛠️ Tech Stack

* TypeScript (Node.js)
* Playwright (scraping engine)
* Axios (fallback + API)
* Groq LLM API
* JSON-based memory system

---

## ▶️ How to Run

### Install

npm install
npx playwright install chromium

---

### Run single analysis

npx ts-node run.ts https://example.com

---

### Run full Phase 7 system

npx ts-node phase7.ts

---

## 🧠 Design Highlights

* Hybrid scraping (browser + fallback)
* Separation of analysis vs monitoring layers
* Noise-resistant diff detection
* Autonomous system behavior (no manual trigger required)

---

## ⚠️ Limitations

* LLM outputs may vary slightly (handled via stable diff logic)
* Some websites block scraping (fallback mitigates this)

---

## 🎯 Conclusion

GuardianAI evolves from a static analysis tool into a **continuous AI monitoring system**, capable of detecting, tracking, and explaining dark pattern changes over time.

---

