# Stock Analysis AI Agent - Vision Document

## Overview
The Stock Analysis AI Agent is an automated system designed to provide technical analysis on stocks and cryptocurrencies directly through Telegram. By leveraging n8n workflows, OpenAI's models (including GPT-4o and Vision), and external charting APIs, the project aims to deliver accessible, on-demand trading insights to users via a natural conversational interface.

## Core Components
The system is currently composed of two foundational n8n workflows:

### 1. User Interaction & Routing (`primary.json`)
This workflow acts as the main gateway for user communication:
- **Telegram Integration**: Serves as the primary chatbot interface.
- **Multi-Modal Input**: Accepts both text messages and voice notes.
- **Voice Transcription**: Automatically transcribes voice recordings into text using OpenAI's audio transcription.
- **Conversational Agent**: Employs an OpenAI GPT-4o powered AI Agent to understand user intent, context, and generate human-like responses.

### 2. Technical Analysis Engine (`secondry.json`)
This workflow acts as the backend service for generating and analyzing market charts:
- **Ticker Processing**: Validates ticker symbols and looks up exchange information (via Yahoo Finance).
- **Chart Generation**: Fetches advanced TradingView chart images for the specific symbol using an external API (`chart-img.com`).
- **AI Image Analysis**: Utilizes OpenAI's multi-modal capabilities to visually analyze the generated chart. It provides a structured technical breakdown, which includes:
  - Trend Analysis
  - Support and Resistance Zones
  - Momentum Analysis
  - Candlestick Behavior
  - Trading Suggestions

## Workflow Synergy & Project Goals
The vision for this project is a seamless integration between these two components. The Conversational AI Agent (primary) will act as the orchestrator. When a user requests an analysis (e.g., via text or voice, "What does the Apple chart look like today?"), the primary agent will trigger the Technical Analysis Engine (secondary) as a tool. The backend will fetch the chart, generate the AI analysis, and the conversational agent will format and deliver these insights back to the user on Telegram.