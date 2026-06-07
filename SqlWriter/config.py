import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings are defined here.
    Settings are loaded from a .env file and environment variables.
    Pydantic-settings handles loading the .env file automatically.
    """
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # --- Generative AI Configuration ---
    GOOGLE_API_KEY: str = "YOUR_API_KEY_HERE"
    GENERATIVE_MODEL: str = 'gemini-1.5-flash'

    # --- Logging Configuration ---
    LOG_LEVEL: str = "INFO"

    # --- Prompt Configuration ---
    PROMPT_TEMPLATE_PATH: str = "Prompt.md"

    # --- Caching Configuration ---
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_CACHE_TTL_SECONDS: int = 3600  # 1 hour

# Create a single, importable instance of the settings
settings = Settings()