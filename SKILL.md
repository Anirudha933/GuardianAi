# SKILL.md
# GuardianAI Skill Registry

## scrape
Scrapes the UI DOM and finds the Terms of Service link for a given URL.
Input: url (string). 
Output: { dom: string, tos: string, source: string, url: string }
File: skills/scrape.skill.ts

## analyseTos
Analyses ToS text for manipulative clauses using Groq groq/llama-3.3-70b-versatile.
Input: tosText (string). 
Output: { clauses: Array<{text, type, severity}> }
File: skills/analyseTos.skill.ts

## detectPatterns
Classifies dark patterns in DOM + ToS with RAG from ChromaDB.
Input: dom (string), tosResult (object), userHash (string).
Output: { patterns: Array<{type, evidence, severity, novel}>, overall_risk: string, confidence: number }
File: skills/detectPatterns.skill.ts

## generateResponse
Formats detection results as a plain text message (Telegram/WhatsApp compatible).
Input: url (string), patterns (object), tosResult (object).
Output: string (max 1000 chars)
File: skills/generateResponse.skill.ts