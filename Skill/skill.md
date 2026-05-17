# Skill: Marp Presentation Formatting Guidelines

## Core Objective
Whenever requested to create a "Presentation" or convert an existing document (PRD, HLD, Vision) into a presentation format, **never just append front-matter to dense text**. You must actively process, summarize, and chunk the information into distinct slides to prevent text overflow.

## Execution Rules

### 1. File Naming Convention
- Do not overwrite the original reading document (e.g., `vision.md`).
- Always create a new file suffixed with `-presentation` (e.g., `vision-presentation.md`, `HLD-presentation.md`).

### 2. Mandatory Front-Matter
Every presentation file must begin with this exact YAML block:
```yaml
---
marp: true
theme: default
class: lead
paginate: true
backgroundColor: #f0f4f8
---
```

### 3. Slide Chunking (The `---` Rule)
- Marp does not automatically paginate long text. Squeezing too much text onto one slide will cause it to overflow off the screen.
- You **MUST** use three dashes (`---`) surrounded by empty lines to explicitly create a new slide.
- **Rule of Thumb:** A single slide should take no longer than 30 seconds to read. Maximum 1 heading, 1 sub-heading, and 4-5 bullet points per slide.

### 4. Content Summarization Strategy
When converting a dense document like a PRD into a presentation:
- **Title Slide:** Document Title, Subtitle, and Author/Date.
- **Overview Slide:** 1-2 sentence summary of the "Why".
- **Extract Bullet Points:** Convert long paragraphs into short, punchy bullet points.
- **Visual Structure:** Use bolding (`**text**`) to highlight key terms. Use emojis to add visual anchors (e.g., 🚀, 📈, 💡) if appropriate for the tone.
- **Code & Diagrams:** Put Mermaid diagrams or code blocks on their own dedicated slides.

## Example Transformation

**Bad (Will Overflow):**
```markdown
---
marp: true
---
# Overview
The Stock Analysis AI Agent is an automated system designed to provide technical analysis on stocks and cryptocurrencies directly through Telegram. By leveraging n8n workflows, OpenAI's models (including GPT-4o and Vision), and external charting APIs, the project aims to deliver accessible, on-demand trading insights to users via a natural conversational interface. It has two components... (more text)
```

**Good (Perfectly Formatted):**
```markdown
---
marp: true
theme: default
class: lead
---

# Stock Analysis AI
## Project Overview

---

# What is it?
- An automated system for technical analysis.
- Accessible directly through **Telegram**.
- Covers both **Stocks** and **Crypto**.

---

# How it Works
Leverages three core technologies:
1. **n8n workflows** for automation.
2. **OpenAI GPT-4o & Vision** for intelligence.
3. **External Charting APIs** for real-time market data.
```