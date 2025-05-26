import os
from typing import List
from pydantic_settings import BaseSettings
import json

class Settings(BaseSettings):
    # API Configuration
    apify_api_token: str = os.getenv("APIFY_API_TOKEN", "")
    notion_token: str = os.getenv("NOTION_TOKEN", "")
    notion_database_id: str = os.getenv("NOTION_DATABASE_ID", "")
    
    # Google Sheets
    google_sheets_credentials: dict = {}
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", "fallback-secret-key-change-in-production")
    allowed_origins: List[str] = ["http://localhost:8000", "http://0.0.0.0:8000"]
    
    # Rate Limiting
    rate_limit_requests: int = int(os.getenv("RATE_LIMIT_REQUESTS", "10"))
    rate_limit_window: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Parse Google Sheets credentials from env
        creds_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS", "{}")
        try:
            self.google_sheets_credentials = json.loads(creds_json)
        except json.JSONDecodeError:
            self.google_sheets_credentials = {}
        
        # Parse allowed origins from env if provided
        origins_env = os.getenv("ALLOWED_ORIGINS", "")
        if origins_env:
            self.allowed_origins = [origin.strip() for origin in origins_env.split(",")]

settings = Settings()
