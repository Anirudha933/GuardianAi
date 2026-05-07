# AI Usage Report

## 🧠 Overview

GuardianAI leverages Large Language Models (LLMs) to analyze Terms of Service, detect dark patterns, and generate structured responses. Phase 7 extends this into a continuous monitoring system.

---

## 🤖 Models Used

* **llama3-8b**

  * Fast inference
  * Used for filtering and formatting outputs

* **llama3-70b**

  * Higher reasoning capability
  * Used for ToS analysis and pattern detection

---

## 🔍 AI Responsibilities

### 1. ToS Analysis

* Parses large legal text
* Extracts clauses and classifies them into:

  * data sharing
  * consent
  * payment
  * renewal
  * arbitration

---

### 2. Dark Pattern Detection

* Uses DOM + ToS analysis
* Identifies deceptive UI/UX patterns
* Produces structured outputs for downstream processing

---

### 3. Response Generation

* Converts raw AI outputs into readable summaries
* Provides:

  * risk level
  * detected patterns
  * recommendations

---

## ⚙️ Design Decisions

* **Split-model architecture**

  * 8B → speed
  * 70B → reasoning

* **Low temperature**

  * Reduces randomness
  * Improves consistency

* **Structured JSON outputs**

  * Enables deterministic comparison
  * Supports diff detection

---

## 🔄 Phase 7 AI Integration

* AI outputs are stored after each scan
* Compared across time using pattern-level diffing
* Only meaningful changes trigger alerts
* Reduces false positives from LLM variability

---

## 📚 Research Augmentation

* Uses ArXiv API for academic references
* Triggered when new patterns are detected
* Provides explainability for detected behavior

---

## 🧪 Testing Strategy

* Modular testing for each Phase 7 component
* Independent validation of:

  * watchlist logic
  * research API integration
  * heartbeat automation

---

## ⚠️ Limitations

* Minor variability in ToS clause extraction
* Addressed via pattern-focused diff detection

---

## 🎯 Conclusion

GuardianAI successfully combines LLM reasoning with deterministic system design to create a robust, scalable, and continuous monitoring pipeline for detecting dark patterns.

---


