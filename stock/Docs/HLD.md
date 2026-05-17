# High-Level Design (HLD) & Architecture

## 1. System Overview
The system is built entirely as serverless workflows orchestrated by n8n. It utilizes a micro-workflow architecture, dividing the conversational interface from the heavy-lifting analytical backend.

## 2. Architecture Diagram

```mermaid
graph TD
    User([User (Telegram)]) -->|Text/Voice Message| N8N_Primary
    
    subgraph n8n Instance
        N8N_Primary[Primary Workflow: Telegram AI Agent]
        N8N_Secondary[Secondary Workflow: Technical Analysis Engine]
    end
    
    N8N_Primary -->|Voice File| OAI_Whisper[OpenAI Whisper API]
    OAI_Whisper -->|Transcription| N8N_Primary
    
    N8N_Primary -->|Execute Tool: Ticker| N8N_Secondary
    
    N8N_Secondary -->|Search Query| YF_API[Yahoo Finance API]
    YF_API -->|Exchange Data| N8N_Secondary
    
    N8N_Secondary -->|Chart Request| CIMG_API[Chart-Img API]
    CIMG_API -->|Chart Image File| N8N_Secondary
    
    N8N_Secondary -->|Image + Prompt| OAI_Vision[OpenAI GPT-4o Vision]
    OAI_Vision -->|Analysis Text| N8N_Secondary
    
    N8N_Secondary -->|Structured Analysis| N8N_Primary
    N8N_Primary -->|Formatted Response| User
```

## 3. Workflow Components

### 3.1. Primary Workflow (`primary.json`)
Acts as the **Frontend Controller**.
- Listens to Telegram Webhooks.
- Routes logic based on message type (Text vs. Voice).
- Manages the Langchain AI Agent, equipping it with the necessary context and tools (calling the secondary workflow).
- Returns the final formatted message to the Telegram Chat ID.

### 3.2. Secondary Workflow (`secondry.json`)
Acts as the **Backend Processing Service**.
- Triggered programmatically via `Execute Workflow Trigger`.
- Handles data sanitization (Regex ticker checking).
- Orchestrates external API calls (Yahoo Finance, Chart-Img).
- Manages the multimodal interaction with OpenAI to generate the final analytical payload.

## 4. Key Design Decisions
- **Separation of Concerns:** Splitting the conversation logic from the chart analysis logic allows the Technical Analysis Engine to be reused by other triggers in the future (e.g., a scheduled daily report workflow) without dragging in Telegram logic.
- **Langchain Integration:** Native n8n Langchain nodes are used to abstract prompt engineering and tool calling, making the bot significantly more resilient to varied user inputs.