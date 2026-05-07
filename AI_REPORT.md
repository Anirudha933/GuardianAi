# AI Usage Report

## Models Used

* llama3-8b (fast model)
* llama3-70b (reasoning model)

## Usage

### ToS Analysis

* 8B model filters relevant chunks
* 70B model extracts manipulative clauses

### Pattern Detection

* 70B model classifies dark patterns using RAG context

### Response Generation

* 8B model formats output into user-friendly response

## Design Decisions

* Split models for cost vs performance
* JSON mode for structured outputs
* Low temperature for deterministic results
