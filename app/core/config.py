import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field
import json
import re

class Settings(BaseSettings):
    # API Configuration
    apify_api_token: str = ""
    notion_token: str = ""  # Users must provide their own token
    notion_database_id: str = ""  # Users must provide their own database ID

    # Google Sheets
    google_sheets_credentials: dict = Field(default_factory=dict)

    # Security
    secret_key: str = Field(default="")  # Must be set via environment variable
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
        Extract database ID from Notion URL or validate existing ID

        Args:
            url_or_id: Either a Notion database URL or a database ID

        Returns:
            Clean 32-character database ID without dashes
        """
        if not url_or_id:
            return ""

        # Remove whitespace
        url_or_id = url_or_id.strip()

        # If it's already a clean 32-character hex string, return as-is
        if len(url_or_id) == 32 and all(c in '0123456789abcdefABCDEF' for c in url_or_id):
            return url_or_id.lower()

        # If it's a 36-character UUID with dashes, remove dashes
        if len(url_or_id) == 36 and url_or_id.count('-') == 4:
            clean_id = url_or_id.replace('-', '')
            if len(clean_id) == 32 and all(c in '0123456789abcdefABCDEF' for c in clean_id):
                return clean_id.lower()

        # Extract from Notion URL patterns
        patterns = [
            r'notion\.so/[^/]+/[^/]*?([0-9a-fA-F]{32})',  # URL with 32-char ID
            r'notion\.so/[^/]+/[^/]*?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})',  # URL with dashed ID
            r'([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})',  # Standalone dashed ID
            r'([0-9a-fA-F]{32})',  # Standalone 32-char ID
        ]

        for pattern in patterns:
            match = re.search(pattern, url_or_id)
            if match:
                found_id = match.group(1)
                # Remove dashes if present
                clean_id = found_id.replace('-', '')
                if len(clean_id) == 32:
                    return clean_id.lower()

        return ""

settings = Settings()