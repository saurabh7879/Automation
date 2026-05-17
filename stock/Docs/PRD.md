# Product Requirements Document (PRD)

## 1. Introduction
The Stock Analysis AI Agent is a Telegram-based chatbot designed to provide automated technical analysis of financial markets (stocks and cryptocurrencies) using AI vision models.

## 2. Target Audience
- Retail day traders and swing traders.
- Crypto investors.
- Users who need quick market analysis while away from their primary trading setups.

## 3. Features & Requirements

### 3.1. User Interface (Telegram)
- **REQ-1:** The system must interact with users exclusively through a Telegram Bot.
- **REQ-2:** The bot must accept standard text messages.
- **REQ-3:** The bot must accept voice notes and automatically transcribe them to text.

### 3.2. Conversational AI Orchestration
- **REQ-4:** An AI agent must parse the user's natural language input to identify the intent (e.g., requesting a stock analysis) and the specific asset ticker (e.g., AAPL, BTC).
- **REQ-5:** The agent must be able to hold a conversational context and return human-readable responses.

### 3.3. Chart Generation & Data Retrieval
- **REQ-6:** The system must validate the requested ticker symbol format.
- **REQ-7:** The system must resolve the ticker to its primary exchange (e.g., NASDAQ) using a reliable data source (Yahoo Finance).
- **REQ-8:** The system must generate a visual chart image for the requested ticker on a daily (1D) interval.

### 3.4. AI Technical Analysis
- **REQ-9:** The system must analyze the generated chart image using a multimodal AI model.
- **REQ-10:** The analysis output must explicitly include:
  - Trend Analysis
  - Support and Resistance Zones
  - Momentum Analysis
  - Candlestick Behavior
  - A definitive trading suggestion or summary.

## 4. User Stories
- **US-1:** As a busy trader, I want to send a voice message to the bot saying "Check the Bitcoin chart" so that I don't have to type while walking.
- **US-2:** As an investor, I want to receive a comprehensive technical breakdown of a stock chart so that I can make an informed decision without opening my trading app.
- **US-3:** As a user, I want the bot to understand natural language so I don't have to use strict slash commands.

## 5. Non-Functional Requirements
- **Performance:** Chart generation and AI analysis should complete and return to the user within 15 seconds.
- **Extensibility:** The architecture must allow for easy swapping of the AI model or charting API.
- **Error Handling:** The bot must gracefully inform the user if an invalid ticker is provided or if the chart cannot be generated.