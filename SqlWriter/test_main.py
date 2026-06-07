import json
from fastapi.testclient import TestClient

from main import app
from config import settings

client = TestClient(app)

# Mock data for requests and responses
MOCK_REQUEST_PAYLOAD = {
    "user_query": "What are the total sales?",
    "context": {
        "DATABASE_SCHEMA": "CREATE TABLE sales (id INT, amount DECIMAL);",
        "REQUEST_ID": "test-123"
    }
}

MOCK_LLM_RESPONSE = {
    "request_id": "test-123",
    "confidence_score": 0.9,
    "sql_query": "SELECT SUM(amount) FROM sales;"
}


def test_analyze_request_success(mocker):
    """
    Tests a successful call to the /analyze endpoint, mocking the generative model call.
    """
    mock_llm_response_str = json.dumps(MOCK_LLM_RESPONSE)
    # Mock the entire call_generative_model function for a simple endpoint test
    mocker.patch('main.call_generative_model', return_value=mock_llm_response_str)

    response = client.post("/analyze", json=MOCK_REQUEST_PAYLOAD)

    assert response.status_code == 200
    assert response.json() == MOCK_LLM_RESPONSE


def test_caching_with_redis(mocker):
    """
    Tests the caching logic within call_generative_model to ensure Redis is used correctly.
    """
    # Mock the Redis client methods and the actual Google API call
    mock_redis_get = mocker.patch('main.redis_client.get')
    mock_redis_set = mocker.patch('main.redis_client.set')
    mock_genai_call = mocker.patch('google.generativeai.GenerativeModel.generate_content')

    # --- First call (cache miss) ---
    mock_redis_get.return_value = None  # Simulate cache miss

    mock_llm_response_str = json.dumps(MOCK_LLM_RESPONSE)
    mock_genai_response = mocker.MagicMock()
    mock_genai_response.text = mock_llm_response_str
    mock_genai_call.return_value = mock_genai_response

    response1 = client.post("/analyze", json=MOCK_REQUEST_PAYLOAD)

    assert response1.status_code == 200
    # Verify it tried to get from cache, called the LLM, and set the cache with TTL
    mock_redis_get.assert_called_once()
    mock_genai_call.assert_called_once()
    mock_redis_set.assert_called_once_with(mocker.ANY, mock_llm_response_str, ex=settings.REDIS_CACHE_TTL_SECONDS)

    # --- Second call (cache hit) ---
    mock_redis_get.return_value = mock_llm_response_str  # Simulate cache hit

    response2 = client.post("/analyze", json=MOCK_REQUEST_PAYLOAD)

    assert response2.status_code == 200
    # Verify it tried to get from cache again
    assert mock_redis_get.call_count == 2
    # Verify the LLM and cache set were NOT called a second time
    mock_genai_call.assert_called_once()
    mock_redis_set.assert_called_once()