# Weather Chatbot — Setup Documentation

## Your Hostinger Details

| | |
|---|---|
| **Server hostname** | `srv1601018.hstgr.cloud` |
| **Domain name** | `framegenai.cloud` |
| **Webhook URL** | `https://srv1601018.hstgr.cloud/webhook/weather-chat` |
| **Chat UI URL** | `https://framegenai.cloud/chat_interface.html` |

---

## Overview

A conversational weather chatbot built on n8n (hosted on Hostinger) that accepts natural language questions and returns real-time weather data formatted by Gemini AI.

**Stack:**
- **n8n** — workflow automation (`srv1601018.hstgr.cloud`)
- **Google Gemini 1.5 Flash** — city extraction + natural language responses
- **OpenWeatherMap API** — real-time weather data
- **HTML/CSS/JS** — standalone chat interface (`framegenai.cloud`)

---

## Project Files

```
n8n_Auto/
├── weather_chatbot_workflow.json   # Import this into n8n
├── chat_interface.html             # Standalone chat UI
└── SETUP.md                        # This file
```

---

## Prerequisites

| Requirement | Details |
|---|---|
| Hostinger n8n instance | `srv1601018.hstgr.cloud` (domain: `framegenai.cloud`) |
| Google Gemini API key | Free — from Google AI Studio |
| OpenWeatherMap API key | Free tier — 60 calls/min, 1000 calls/day |

---

## Step 1 — Get API Keys

### Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy and save the key securely

### OpenWeatherMap API Key
1. Visit [openweathermap.org](https://openweathermap.org) and create a free account
2. Go to **My Profile → My API Keys**
3. Copy the default API key (or generate a new one)
4. Note: new keys activate within 10 minutes

---

## Step 2 — Configure Environment Variables in n8n

Add the following to your n8n environment before importing the workflow.

### On Hostinger (hPanel)
1. Open **hPanel → Hosting → Manage**
2. Navigate to your n8n instance settings
3. Find the **Environment Variables** or **.env file** section
4. Add:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENWEATHER_API_KEY=your_openweathermap_api_key_here
   ```
5. Save and restart n8n if prompted

### Verify Variables Are Loaded
In n8n, open any workflow and in a Code node run:
```javascript
return [{ json: { gemini: $env['GEMINI_API_KEY'] ? 'SET' : 'MISSING' } }];
```

---

## Step 3 — Import the Workflow

1. Log in to your n8n dashboard
2. Click **+ New Workflow**
3. Click the **⋮ (three dots)** menu → **Import from file**
4. Select `weather_chatbot_workflow.json`
5. The workflow will load with 8 nodes

---

## Workflow Architecture

```
POST /webhook/weather-chat
        │
        ▼
┌─────────────────┐
│  Chat Webhook   │  Receives: { "message": "What's the weather in Paris?" }
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Extract City   │  Gemini: extracts city name from natural language
│  (Gemini AI)    │  Returns: "Paris" or "UNKNOWN"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Set Variables  │  Stores: city, userMessage
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  City Found?    │──── NO ────► "Please specify a city" response
└────────┬────────┘
         │ YES
         ▼
┌─────────────────┐
│   Get Weather   │  OpenWeatherMap: fetches real-time weather data
│  (OWM API)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Format Response │  Gemini: creates a friendly 2-3 sentence reply
│  (Gemini AI)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send Response  │  Returns: { status, reply, city }
└─────────────────┘
```

---

## Step 4 — Activate the Workflow

1. In the workflow editor, click the **Activate** toggle (top-right corner)
2. The toggle turns **green** when active
3. Copy your webhook URL — shown in the Webhook node:
   ```
   https://srv1601018.hstgr.cloud/webhook/weather-chat
   ```

---

## Step 5 — Test the Webhook

Run this from your terminal or use a tool like Postman:

```bash
curl -X POST https://srv1601018.hstgr.cloud/webhook/weather-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather in London?"}'
```

**Expected response:**
```json
{
  "status": "success",
  "reply": "London is currently experiencing partly cloudy skies with a temperature of 14°C...",
  "city": "London"
}
```

**Test edge case (no city):**
```bash
curl -X POST https://srv1601018.hstgr.cloud/webhook/weather-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Is it going to rain today?"}'
```

---

## Step 6 — Configure the Chat Interface

Open `chat_interface.html` in a text editor and update line in the script section:

```js
// Before
// Already configured — no change needed:
const WEBHOOK_URL = "https://srv1601018.hstgr.cloud/webhook/weather-chat";
```

---

## Step 7 — Host the Chat Interface Publicly

### Option A — Hostinger File Manager (Recommended)
> The `chat_interface.html` file is already pre-configured with your webhook URL.

1. Log in to **hPanel** at [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Go to **Hosting → Manage → File Manager**
3. Navigate to `public_html/`
4. Click **Upload** and select `chat_interface.html`
5. Done — access your chatbot at:
   ```
   https://framegenai.cloud/chat_interface.html
   ```

### Option B — Subfolder (cleaner URL)
1. Inside `public_html/`, create a folder called `chatbot`
2. Upload `chat_interface.html` as `index.html` inside it
3. Access at: `https://framegenai.cloud/chatbot/`

### Option C — Netlify Drop (if not using Hostinger hosting)
1. Visit [netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop `chat_interface.html`
3. Get a live URL instantly (no configuration needed)

---

## API Reference

### Webhook Endpoint

```
POST /webhook/weather-chat
```

**Request body:**
```json
{
  "message": "string — natural language weather question"
}
```

**Success response (200):**
```json
{
  "status": "success",
  "reply": "string — Gemini-formatted weather answer",
  "city": "string — extracted city name"
}
```

**No city found response (200):**
```json
{
  "status": "error",
  "reply": "I couldn't find a city in your message. Try asking something like: 'What's the weather in London?'"
}
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `401 Unauthorized` from Gemini | Invalid or missing API key | Check `GEMINI_API_KEY` env var |
| `401 Unauthorized` from OpenWeatherMap | Invalid or new API key | Wait 10 min for new keys to activate |
| `404 city not found` | City name not recognized | Try full city name (e.g., "New York" not "NY") |
| Workflow doesn't trigger | Workflow not activated | Toggle the Activate switch to green |
| CORS error in browser | Missing header | Ensure `Access-Control-Allow-Origin: *` is set in the Respond node |
| `Cannot read property of undefined` | Gemini returned unexpected format | Check n8n execution logs for the raw Gemini response |

---

## Free Tier Limits

| Service | Free Limit |
|---|---|
| Gemini 1.5 Flash | 15 requests/min, 1 million tokens/day |
| OpenWeatherMap | 60 calls/min, 1,000 calls/day |
| Hostinger n8n | Depends on your hosting plan |

For a personal chatbot, these limits are more than sufficient.

---

## Example Questions the Bot Handles

```
"What's the weather in Tokyo?"
"Is it raining in Mumbai right now?"
"How cold is it in Moscow?"
"Should I carry an umbrella in Paris today?"
"What's the humidity like in Dubai?"
"Tell me about the weather in New York"
```
