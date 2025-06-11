from pydantic import BaseModel, validator, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from app.core.config import settings

class FieldType(str, Enum):
    NAME = "name"
    EMAIL = "email"
    PHONE = "phone"
    COMPANY = "company"
    TITLE = "title"
    LOCATION = "location"
    INDUSTRY = "industry"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    WEBSITE = "website"

class ScrapeRequest(BaseModel):
    urls: List[str] = Field(..., min_length=1, max_length=10)
    lead_count: int = Field(default=100, ge=1, le=50000)
    fields: List[FieldType] = Field(default=[
        FieldType.NAME,
        FieldType.EMAIL,
        FieldType.PHONE,
        FieldType.COMPANY,
        FieldType.TITLE,
        FieldType.LOCATION,
        FieldType.INDUSTRY,
        FieldType.LINKEDIN,
        FieldType.TWITTER,
        FieldType.INSTAGRAM,
        FieldType.FACEBOOK,
        FieldType.WEBSITE
    ])
    apify_token: str = Field(..., min_length=1)
    
    @validator('urls')
    def validate_urls(cls, v):
        for url in v:
            if not url.startswith(('http://', 'https://')):
                raise ValueError('Invalid URL format')
        return v

class SheetsRequest(BaseModel):
    spreadsheet_id: str
    sheet_name: str = "Leads"
    data: List[Dict[str, Any]]
    google_credentials: Dict[str, Any]

class NotionRequest(BaseModel):
    database_id: str
    data: List[Dict[str, Any]]
    notion_token: str
    
    @validator('database_id')
    def validate_database_id(cls, v):
        """Extract clean database ID from Notion URL or validate existing ID"""
        if not v:
            raise ValueError('Database ID is required')
        
        # Use the utility function to extract/clean the database ID
        clean_id = settings.extract_notion_database_id(v)
        
        if not clean_id:
            raise ValueError(f'Invalid Notion database ID format: {v}')
        
        # Validate the cleaned ID format (32 hex characters)
        if len(clean_id) != 32:
            raise ValueError(f'Database ID must be 32 characters long, got {len(clean_id)}: {clean_id}')
        
        return clean_id

class ScrapeResponse(BaseModel):
    task_id: str
    status: str
    message: str
    data: Optional[List[Dict[str, Any]]] = None
    total_count: Optional[int] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"
    services: Dict[str, str]

class TaskStatus(BaseModel):
    task_id: str
    status: str
    progress: int
    message: str
    data: Optional[List[Dict[str, Any]]] = None
    total_count: Optional[int] = None

class ExportResponse(BaseModel):
    status: str
    message: str
    created_count: Optional[int] = None
    updated_rows: Optional[int] = None
    errors: Optional[List[str]] = None
