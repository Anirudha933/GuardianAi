# GuardianAI

GuardianAI is an AI-powered system that detects dark patterns in websites and Terms of Service.

## Features

* Detects deceptive UI patterns
* Analyses Terms of Service using LLMs
* Uses RAG (ChromaDB) for improved detection
* Flags novel patterns

## Pipeline

scrape → analyseTos → detectPatterns → generateResponse

## How to Run

npm install
npx playwright install chromium

Run scan:
npx ts-node run.ts https://example.com

## Load Testing

* Tested with 3 concurrent users
* P95 latency: ~5.3 seconds
* Stable performance achieved after optimisation

## Tech Stack

* TypeScript (Node.js)
* Groq API (LLMs)
* Playwright (scraping)
* ChromaDB (vector database)

## Notes

* Initial 10-user test caused memory issues due to browser overhead
* Optimised for stable execution under constrained environments
