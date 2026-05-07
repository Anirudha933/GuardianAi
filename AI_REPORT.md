# AI Usage Report

## 🧠 Overview

GuardianAI uses Large Language Models (LLMs) to analyze Terms of Service, detect dark patterns, and generate user-friendly responses.

---

## 🤖 Models Used

* **llama3-8b**

  * Fast inference
  * Used for filtering and formatting

* **llama3-70b**

  * Higher reasoning capability
  * Used for ToS analysis and pattern detection

---

## 🔍 Where AI is Used

### 1. ToS Analysis

* Extracts clauses from large legal text
* Classifies clauses into categories:

  * data sharing
  * consent
  * payment
  * renewal
  * arbitration

---

### 2. Pattern Detection

* Uses analyzed ToS + DOM data
* Identifies potential dark patterns
* Uses structured reasoning (JSON outputs)

---

### 3. Response Generation

* Converts raw AI output into human-readable format
* Provides:

  * risk level
  * detected patterns
  * recommendations

---

## ⚙️ Design Decisions

* **Split-model approach**

  * 8B → speed
  * 70B → reasoning

* **Low temperature**

  * Ensures consistent output
  * Reduces randomness

* **Structured JSON outputs**

  * Improves reliability
  * Enables deterministic processing

---

## 🔄 Phase 7 AI Integration

* AI results are stored and compared across time
* Only meaningful changes (pattern-level) trigger updates
* Reduces noise from LLM variability

---

## 📚 Research Augmentation

* Uses ArXiv API to fetch related research papers
* Triggered when new patterns are detected
* Enhances explainability of system output

---

## ⚠️ Limitations

* LLM outputs may vary slightly across runs
* Addressed using pattern-based diff detection

---

## 🎯 Conclusion

The system effectively combines LLM reasoning with deterministic logic to create a reliable and scalable AI monitoring pipeline.

---

