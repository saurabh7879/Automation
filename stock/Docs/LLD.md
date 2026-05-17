# Low-Level Design (LLD)

## 1. Introduction
This document details the node-level configuration, data flows, and API specifications for the Stock Analysis AI Agent n8n workflows.

## 2. Workflow 1: Telegram AI Agent (`primary.json`)

### 2.1. Node Breakdown
1. **Telegram Trigger:** Listens for `message` updates.
2. **Switch (Router):** 
   - Route 0 (`voice`): If `={{ $json.message.voice }}` exists.
   - Route 1 (`text`): If `={{ $json.message.text }}` exists.
3. **Download Voice:** Uses Telegram API to fetch the file binary via `={{ $json.message.voice.file_id }}`.
4. **Transcribe Audio:** Uses `@n8n/n8n-nodes-langchain.openAi` (Operation: transcribe) on the binary `data` property.
5. **Set Text:** Maps the incoming text message to a standard `prompt` variable.
6. **AI Agent:** 
   - Langchain Agent Node.
   - Input Text: `={{ $json.prompt || $json.text }}`.
   - *Note: This agent must be configured to call the Secondary Workflow as a custom tool.*
7. **OpenAI Chat Model:** Supplies the LLM engine (`gpt-4o`) to the AI Agent.
8. **Send Message:** Uses Telegram API to send the agent's output `={{ $json.output }}` back to `={{ $json.message.chat.id }}`.

## 3. Workflow 2: Technical Analysis Engine (`secondry.json`)

### 3.1. Node Breakdown
1. **Workflow Input Trigger:** Entry point receiving `ticker` variable.
2. **Check Ticker Format (Switch):** Uses Regex `^[A-Z0-9]+$` to ensure the ticker is alphanumeric.
3. **Lookup Exchange (HTTP Request):**
   - GET `https://query1.finance.yahoo.com/v1/finance/search?q={{ $json.ticker }}`
4. **Parse Interval (Code):** Hardcodes the chart interval to `1D` (Daily) and sets a default exchange.
5. **Set Ticker:** Formats output to `symbol` and `interval`.
6. **Get Chart URL (HTTP Request):**
   - GET `https://api.chart-img.com/v2/tradingview/advanced-chart?symbol={{ $json.symbol }}&interval={{ $json.interval }}`
7. **Download Chart (HTTP Request):** Fetches the actual image binary from the returned URL.
8. **Technical Analysis (OpenAI Langchain):**
   - Operation: analyze (Multimodal).
   - Prompt: *"Analyze this stock or crypto trading chart. Provide trend analysis, support and resistance zones, momentum analysis, candlestick behavior, and trading suggestion."*
   - Binary Property: `data`.
9. **Format Response (Set):** Standardizes the output to an `analysis` string variable to be consumed by the Primary workflow.

## 4. API Contracts & Credentials

### 4.1. Internal Workflow Contract
**Secondary Workflow Input:**
```json
{
  "ticker": "AAPL"
}
```
**Secondary Workflow Output:**
```json
{
  "analysis": "**Trend:** Bullish...\n**Support:** $150..."
}
```

### 4.2. External APIs
- **Telegram API:** Requires `Telegram Bot Token`.
- **OpenAI API:** Requires `OpenAI API Key`. Used for Transcription, LLM Routing, and Vision Analysis.
- **Chart-img API:** Base URL: `api.chart-img.com`. May require an API key configured via headers depending on usage limits.
- **Yahoo Finance:** Base URL: `query1.finance.yahoo.com`. Publicly accessible search endpoint.