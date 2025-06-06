import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field
import json
import re

class Settings(BaseSettings):
    # API Configuration
    apify_api_token: str = ""
    notion_token: str = "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"  # User's token as fallback
    notion_database_id: str = "209a7ac6580c8047b82eefd17ee26fe0"  # User's database ID as fallback
    
    # Google Sheets
    google_sheets_credentials: dict = Field(default_factory=dict)
    
    # Security
    secret_key: str = "fallback-secret-key-change-in-production"
    allowed_origins: List[str] = Field(default=["http://localhost:5000", "http://0.0.0.0:5000"])
    
    # Rate Limiting
    rate_limit_requests: int = 10
    rate_limit_window: int = 60
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Parse Google Sheets credentials from env
        creds_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS", "{}")
        try:
            if creds_json and creds_json != "{}":
                self.google_sheets_credentials = json.loads(creds_json)
        except json.JSONDecodeError:
            self.google_sheets_credentials = {}
        
        # Parse allowed origins from env if provided
        origins_env = os.getenv("ALLOWED_ORIGINS", "")
        if origins_env:
            self.allowed_origins = [origin.strip() for origin in origins_env.split(",")]
    
    @staticmethod
    def extract_notion_database_id(url_or_id: str) -> str:
        """
        Extract Notion database ID from various URL formats or return the ID if already clean.
        
        Supported formats:
        - https://www.notion.so/209a7ac6580c8047b82eefd17ee26fe0?v=...
        - https://notion.so/209a7ac6580c8047b82eefd17ee26fe0
        - notion.so/myworkspace/209a7ac6580c8047b82eefd17ee26fe0
        - 209a7ac6580c8047b82eefd17ee26fe0 (already clean)
        """
        if not url_or_id:
            return ""
        
        # Clean the input
        clean_input = url_or_id.strip()
        
        # If it's already a clean database ID (32 characters, alphanumeric + dashes)
        if re.match(r'^[a-f0-9]{32}$', clean_input.replace('-', '')):
            return clean_input.replace('-', '')
        
        # Extract from various URL patterns
        patterns = [
            # Standard Notion URLs
            r'notion\.so/([a-f0-9]{32})',
            r'notion\.so/.*?([a-f0-9]{32})',
            # URLs with dashes in database ID
            r'notion\.so/([a-f0-9-]{36})',
            r'notion\.so/.*?([a-f0-9-]{36})',
            # Direct database ID patterns
            r'([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})',
            r'([a-f0-9]{32})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, clean_input, re.IGNORECASE)
            if match:
                database_id = match.group(1)
                # Remove dashes if present
                return database_id.replace('-', '')
        
        # If no pattern matches, return the original input cleaned
        return clean_input.split('?')[0].split('#')[0].split('/')[-1]

settings = Settings()
