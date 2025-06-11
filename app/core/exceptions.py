# File: app/core/exceptions.py
# Purpose: Custom exception classes for structured error handling

class ExternalAPIError(Exception):
    """Raised when external API calls fail (Apify, OpenAI, etc.)"""
    pass

class ExportError(Exception):
    """Raised when data export operations fail (Sheets, Notion, CSV)"""
    pass

class AIAgentError(Exception):
    """Raised when AI agent operations fail (LLM calls, parsing, etc.)"""
    pass

class TaskStoreError(Exception):
    """Raised when task storage operations fail"""
    pass 