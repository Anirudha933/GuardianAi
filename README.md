# GuardianAI

GuardianAI is a dark-pattern detection agent that analyzes a URL, extracts UI/ToS signals, and produces a plain-text risk report. It is built around modular "skills" that scrape content, analyze ToS clauses, detect patterns with RAG context, and generate a response.

## Features

- Headless scraping with Playwright and a safe axios fallback.
- ToS clause analysis using Groq models.
- Pattern detection with a lightweight in-memory vector store.
- Memory and watchlist storage per user hash.
- Plain-text report output for chat channels (Telegram/WhatsApp).

## Project Structure

- lib/ - Core helpers (Groq client, memory, vector store, security utilities).
- skills/ - Skill modules: scrape, analyze ToS, detect patterns, generate response.
- data/ - Local data storage (memory files).
- test/ - TypeScript test scripts for phases.

## Requirements

- Node.js >= 22
- npm

## Setup

```bash
npm install
```

Create a .env file in the project root:

```bash
GROQ_API_KEY=your_key_here
# Optional: override memory storage path
# MEMORY_PATH=./data/memory
```

If you run tests with ts-node, keep TypeScript config in sync with ESM settings.

## Run Scripts

- Build TypeScript:

```bash
npm run build
```

- Start OpenClaw gateway (if used in your environment):

```bash
npm start
```

- Run a TypeScript test file with the new register() loader:

```bash
npm run ts-run -- test/phase4.mem.ts
```

## Notes

- Memory files are stored under data/memory unless MEMORY_PATH is set.
- Playwright requires Chromium.
