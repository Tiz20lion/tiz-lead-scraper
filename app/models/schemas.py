from pydantic import BaseModel, validator, Field
from typing import List, Optional, Dict, Any
from enum import Enum

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
    WEBSITE = "website"

class ScrapeRequest(BaseModel):
    urls: List[str] = Field(..., min_length=1, max_length=10)
    lead_count: int = Field(default=100, ge=1, le=50000)
    fields: List[FieldType] = Field(default=[FieldType.NAME, FieldType.EMAIL])
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
