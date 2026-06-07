import json
from typing import Dict, Any
import logging
from fastapi import FastAPI
from pydantic import BaseModel
import redis
from google import genai
import hashlib
from config import settings

# Configure logging for the web service
logging.basicConfig(
    level=settings.LOG_LEVEL.upper(),
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Configure the generative AI model using the GOOGLE_API_KEY environment variable.
if not settings.GOOGLE_API_KEY or settings.GOOGLE_API_KEY == "YOUR_API_KEY_HERE":
    logging.critical("CRITICAL: The 'GOOGLE_API_KEY' environment variable is not set or is a placeholder.")
    logging.critical("Please create a .env file with your GOOGLE_API_KEY and restart the application.")
    exit(1)
client = genai.Client(api_key=settings.GOOGLE_API_KEY)

# --- Caching Setup ---
try:
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        decode_responses=True  # To get strings back from Redis
    )
    redis_client.ping()
    logging.info("Successfully connected to Redis for caching.")
except redis.exceptions.ConnectionError as e:
    logging.warning(f"Could not connect to Redis: {e}. Caching will be disabled.")
    redis_client = None


def call_generative_model(prompt: str) -> str:
    """
    Calls the generative AI model with the given prompt and returns the response.
    This function is cached in Redis to avoid repeated API calls for the same prompt.
    """
    # Use a SHA256 hash of the prompt as the cache key to handle large prompts
    cache_key = f"copilot-cache:{hashlib.sha256(prompt.encode()).hexdigest()}"

    # Check cache first if Redis is available
    if redis_client:
        try:
            cached_response = redis_client.get(cache_key)
            if cached_response:
                logging.info(f"Cache hit for key: {cache_key}")
                return cached_response
        except redis.exceptions.RedisError as e:
            logging.error(f"Redis error while getting cache: {e}. Proceeding without cache.")

    logging.info(f"Cache miss for key: {cache_key}. Calling the generative AI model.")
    logging.debug(f"LLM Prompt (first 1000 chars on cache miss): {prompt[:1000]}...")

    # For this example, we'll use the gemini-1.5-flash model
    model = genai.GenerativeModel(settings.GENERATIVE_MODEL)

    # The prompt template is designed to produce JSON.
    # To ensure the model *only* outputs JSON, we set the response mime type.
    generation_config = genai.types.GenerationConfig(
        response_mime_type="application/json"
    )

    try:
        response = model.generate_content(prompt, generation_config=generation_config)
        llm_response_text = response.text

        # Store in cache if Redis is available
        if redis_client:
            try:
                redis_client.set(cache_key, llm_response_text, ex=settings.REDIS_CACHE_TTL_SECONDS)
            except redis.exceptions.RedisError as e:
                logging.error(f"Redis error while setting cache: {e}.")

        return llm_response_text
    except Exception as e:
        logging.error(f"Error calling the generative AI model: {e}", exc_info=True)
        # Return a JSON string with an error message, which the caller can parse.
        error_response = {"error": "Failed to get a response from the generative model.", "details": str(e)}
        return json.dumps(error_response)

class AnalyticsCopilot:
    """
    An orchestrator for the Enterprise AI Analytics Copilot.
    """
    def __init__(self, prompt_template_path: str):
        with open(prompt_template_path, 'r', encoding='utf-8') as f:
            self.prompt_template = f.read()

    def _construct_prompt(self, context: Dict[str, Any]) -> str:
        """
        Constructs the full prompt by replacing placeholders in the template.
        """
        prompt = self.prompt_template
        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}"
            prompt = prompt.replace(placeholder, str(value))
        return prompt

    def handle_request(self, user_query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handles a user request by generating a prompt, calling the LLM,
        and parsing the response.
        """
        context['USER_QUERY'] = user_query

        final_prompt = self._construct_prompt(context)

        llm_response_str = call_generative_model(final_prompt)

        try:
            llm_response_json = json.loads(llm_response_str)
            return llm_response_json
        except json.JSONDecodeError as e:
            logging.error("Failed to decode JSON response from the model.", exc_info=True)
            return {"error": "Invalid JSON response from model", "details": str(e)}

# --- API Setup ---

app = FastAPI(
    title="Enterprise AI Analytics Copilot",
    description="An API for converting business questions into SQL and BI insights.",
    version="1.0.0",
)

class AnalyticsRequest(BaseModel):
    user_query: str
    context: Dict[str, Any]

# --- Global Setup ---
# This code runs once when the application starts up.

logging.info("Initializing Analytics Copilot...")
copilot = AnalyticsCopilot(prompt_template_path=settings.PROMPT_TEMPLATE_PATH)
logging.info(f"Analytics Copilot initialized with prompt from: {settings.PROMPT_TEMPLATE_PATH}")

@app.post("/analyze", response_model=Dict[str, Any])
async def analyze_request(request: AnalyticsRequest):
    """
    Accepts a user's business question and context, then returns a detailed
    analysis including a SQL query, insights, and recommendations.
    """
    logging.info(f"Received analysis request for user_query: '{request.user_query}'")
    response = copilot.handle_request(user_query=request.user_query, context=request.context)
    return response