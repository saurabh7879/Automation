# Setup & Deployment Guide

## 1. Prerequisites
Before setting up the Stock Analysis AI Agent, ensure you have the following:
- An active instance of **n8n** (version 1.0+ recommended due to Langchain node usage).
- An **OpenAI API Key** with access to `gpt-4o` and Whisper models.
- A **Telegram Bot Token** (obtainable via BotFather on Telegram).
- (Optional but recommended) An API Key for `chart-img.com` if rate limits apply.

## 2. Import Workflows

### 2.1. Import Secondary Workflow
1. Open your n8n interface.
2. Click on **Add Workflow**.
3. Select **Import from File** in the top right menu.
4. Select `secondry.json` from the `/stock` folder.
5. Save the workflow and note its **Workflow ID** (found in the URL, e.g., `/workflow/123`).
6. Toggle the workflow to **Active**.

### 2.2. Import Primary Workflow
1. Create another new workflow.
2. Import `primary.json` from the `/stock` folder.
3. **Crucial Step:** You must configure the AI Agent node to connect to the secondary workflow. 
   - Add a "Call n8n Workflow" Tool to the AI Agent.
   - Select the Secondary Workflow you just imported.
   - Describe the tool clearly to the LLM (e.g., "Use this tool to get visual technical analysis for a specific stock ticker").

## 3. Configure Credentials

1. **Telegram API:**
   - Open the Telegram Trigger node in the primary workflow.
   - Create new credentials and paste your Telegram Bot Token.
2. **OpenAI API:**
   - Open the OpenAI Chat Model node in the primary workflow.
   - Create new credentials and paste your OpenAI API Key.
   - Repeat this for the "Transcribe Audio" node and the "Technical Analysis" node in the secondary workflow.

## 4. Testing & Activation

1. Once all credentials are set and both workflows are saved, toggle the **Primary Workflow** to **Active**.
2. Open Telegram and navigate to your bot.
3. Send a test message: *"Can you analyze TSLA for me?"*
4. The bot should reply within 10-15 seconds with a comprehensive technical breakdown.
5. Send a voice message saying a ticker to verify the transcription pipeline is working.

## 5. Troubleshooting
- **No Response:** Check the execution logs in the primary workflow. Ensure the Telegram trigger is firing.
- **Workflow Error in Tool Call:** Ensure the Secondary Workflow is active and that the "Call n8n Workflow" tool in the primary agent is pointing to the correct Workflow ID.
- **Chart Failure:** If the AI complains it can't see the chart, check the HTTP Request nodes in `secondry.json` to ensure `chart-img.com` is returning a valid image binary.