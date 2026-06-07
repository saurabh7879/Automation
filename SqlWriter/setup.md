# Application Setup and Execution Guide

This guide provides step-by-step instructions for setting up the environment, configuring, and running the Enterprise AI Analytics Copilot application.

## 1. Prerequisites

Before you begin, ensure you have the following installed:

*   **Python 3.8+**: You can download it from [python.org](https://www.python.org/downloads/).
*   **Redis** (Optional): The application uses Redis for caching to improve performance. If Redis is not available, the application will run with caching disabled. You can install Redis from [redis.io](https://redis.io/docs/getting-started/installation/).

## 2. Installation

Follow these steps to set up your local development environment.

### a. Clone the Repository

If you haven't already, get the project on your local machine.

### b. Create a Virtual Environment

It is highly recommended to use a virtual environment to manage project dependencies.

```bash
# For Windows
python -m venv venv
venv\Scripts\activate

# For macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### c. Install Dependencies

The project's dependencies are listed in the `requirements.txt` file. Install them using pip:

```bash
pip install -r requirements.txt
```

## 3. Configuration

The application requires environment variables for configuration. These are loaded from a `.env` file in the project root.

### a. Create the .env file

Create a new file named `.env` in the root directory of the project (`e:\n8n_Auto\Automation\SqlWriter\.env`).

### b. Add Environment Variables

Add the following required and optional variables to your `.env` file:

```env
# --- Required ---
# Get your API key from Google AI Studio (https://aistudio.google.com/app/apikey)
GOOGLE_API_KEY="YOUR_ACTUAL_GOOGLE_API_KEY"

# --- Optional ---
# The application defaults to localhost:6379 if these are not set.
# Only change these if your Redis instance is on a different host or port.
# REDIS_HOST="localhost"
# REDIS_PORT=6379
```

> **Critical**: The application will not start without a valid `GOOGLE_API_KEY`. Replace `"YOUR_ACTUAL_GOOGLE_API_KEY"` with your key.

## 4. Running the Application

To start the web service, run the following command from the project's root directory:

```bash
uvicorn main:app --reload
```

Once the server is running, you can access the interactive API documentation (provided by Swagger UI) at **`http://127.0.0.1:8000/docs`**. You can use this interface to send test requests to the `/analyze` endpoint.

## 5. Running Tests

The project includes a test suite to verify its functionality using `pytest`. To run the tests, execute the following command in your terminal:

```bash
pytest
```