# Dockerized Apollo.io Web Scraper - Complete Implementation Guide

## 📋 Project Overview

This guide provides a complete implementation for a Dockerized web scraper that sources leads from Apollo.io via Apify API, with FastAPI backend, Google Sheets integration, Notion sync, and a modern animated UI.

## 🏗️ Architecture Overview

```
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── core/
│   │   ├── config.py          # Configuration and environment variables
│   │   ├── security.py        # Security middleware and CSRF protection
│   │   └── logging_config.py  # Structured logging setup
│   ├── clients/
│   │   ├── apify_client.py    # Apollo.io scraping via Apify
│   │   ├── sheets_client.py   # Google Sheets integration
│   │   └── notion_client.py   # Notion database operations
│   ├── api/
│   │   ├── routes.py          # API endpoints
│   │   └── middleware.py      # Custom middleware
│   ├── models/
│   │   └── schemas.py         # Pydantic models for validation
│   └── static/
│       ├── index.html         # Single-page UI
│       ├── css/
│       │   └── styles.css     # Custom styles
│       └── js/
│           └── app.js         # Frontend JavaScript
├── Dockerfile
├── requirements.txt
├── docker-compose.yml
└── README.md
```

## 🚀 Step-by-Step Implementation

### Step 1: Environment Setup

Create a `.env` file (never commit to repo):
```env
# API Tokens
APIFY_API_TOKEN=your_apify_token_here
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}
NOTION_TOKEN=secret_your_notion_token
NOTION_DATABASE_ID=your_notion_db_id

# Security
SECRET_KEY=your-super-secret-key-here
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW=60

# Logging
LOG_LEVEL=INFO
```

### Step 2: Core Configuration

**app/core/config.py**
```python
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
    secret_key: str = os.getenv("SECRET_KEY", "fallback-secret-key")
    allowed_origins: List[str] = ["http://localhost:8000"]
    
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

settings = Settings()
```

### Step 3: Structured Logging Setup

**app/core/logging_config.py**
```python
import structlog
import logging
import sys
from app.core.config import settings

def setup_logging():
    # Configure stdlib logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper())
    )
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    return structlog.get_logger()

logger = setup_logging()
```

### Step 4: Security Middleware

**app/core/security.py**
```python
from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import time
from collections import defaultdict
import hmac
import hashlib
from app.core.config import settings

# Rate Limiting
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, calls: int = 10, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        now = time.time()
        
        # Clean old requests
        self.clients[client_ip] = [
            req_time for req_time in self.clients[client_ip]
            if now - req_time < self.period
        ]
        
        # Check rate limit
        if len(self.clients[client_ip]) >= self.calls:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        self.clients[client_ip].append(now)
        response = await call_next(request)
        return response

# CSRF Protection
def generate_csrf_token(secret_key: str, user_id: str = "anonymous") -> str:
    message = f"{user_id}{int(time.time())}"
    return hmac.new(
        secret_key.encode(), 
        message.encode(), 
        hashlib.sha256
    ).hexdigest()

def verify_csrf_token(token: str, secret_key: str, user_id: str = "anonymous") -> bool:
    try:
        # In production, implement proper token validation with expiry
        return len(token) == 64  # Basic validation
    except Exception:
        return False

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdnjs.cloudflare.com; "
            "font-src 'self' fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self'"
        )
        
        return response
```

### Step 5: Pydantic Models

**app/models/schemas.py**
```python
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
    WEBSITE = "website"

class ScrapeRequest(BaseModel):
    urls: List[str] = Field(..., min_items=1, max_items=10)
    lead_count: int = Field(default=100, ge=1, le=1000)
    fields: List[FieldType] = Field(default=[FieldType.NAME, FieldType.EMAIL])
    
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

class NotionRequest(BaseModel):
    database_id: Optional[str] = None
    data: List[Dict[str, Any]]

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
```

### Step 6: Apify Client Implementation

**app/clients/apify_client.py**
```python
import asyncio
from typing import List, Dict, Any, Optional
from apify_client import ApifyClient
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings

logger = structlog.get_logger(__name__)

class ApifyApolloClient:
    def __init__(self):
        self.client = ApifyClient(settings.apify_api_token)
        self.actor_id = "code_crafter/apollo-io-scraper"
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def scrape_apollo_leads(
        self, 
        urls: List[str], 
        lead_count: int = 100,
        fields: List[str] = None
    ) -> Dict[str, Any]:
        """
        Scrape leads from Apollo.io URLs using Apify
        """
        logger.info("Starting Apollo scraping", urls=urls, lead_count=lead_count)
        
        try:
            all_results = []
            
            for url in urls:
                # Prepare Actor input
                run_input = {
                    "url": url,
                    "maxResults": min(lead_count, 1000),  # Apify actor limit
                    "fields": fields or ["name", "email", "company", "title"]
                }
                
                logger.info("Running Apify actor", url=url, input=run_input)
                
                # Run the Actor and wait for completion
                run = self.client.actor(self.actor_id).call(run_input=run_input)
                
                # Fetch results
                dataset_id = run["defaultDatasetId"]
                items = list(self.client.dataset(dataset_id).iterate_items())
                
                logger.info("Apify run completed", 
                           dataset_id=dataset_id, 
                           items_count=len(items))
                
                # Process and clean data
                processed_items = self._process_items(items, fields)
                all_results.extend(processed_items)
                
                # Respect rate limits
                await asyncio.sleep(1)
            
            return {
                "status": "success",
                "data": all_results[:lead_count],  # Limit to requested count
                "total_scraped": len(all_results),
                "message": f"Successfully scraped {len(all_results)} leads"
            }
            
        except Exception as e:
            logger.error("Apify scraping failed", error=str(e))
            return {
                "status": "error",
                "data": [],
                "total_scraped": 0,
                "message": f"Scraping failed: {str(e)}"
            }
    
    def _process_items(self, items: List[Dict], requested_fields: List[str]) -> List[Dict]:
        """Process and clean scraped items"""
        processed = []
        
        for item in items:
            processed_item = {}
            
            # Map common fields
            field_mapping = {
                "name": ["name", "full_name", "firstName", "lastName"],
                "email": ["email", "email_address"],
                "phone": ["phone", "phone_number", "phoneNumber"],
                "company": ["company", "organization", "companyName"],
                "title": ["title", "job_title", "position"],
                "location": ["location", "city", "country"],
                "linkedin": ["linkedin", "linkedin_url", "linkedinUrl"],
                "twitter": ["twitter", "twitter_url", "twitterUrl"],
                "website": ["website", "company_website", "websiteUrl"]
            }
            
            for field in requested_fields:
                value = None
                if field in field_mapping:
                    for key in field_mapping[field]:
                        if key in item and item[key]:
                            value = item[key]
                            break
                
                processed_item[field] = value or ""
            
            if any(processed_item.values()):  # Only add if has some data
                processed.append(processed_item)
        
        return processed

# Initialize client
apify_client = ApifyApolloClient()
```

### Step 7: Google Sheets Client

**app/clients/sheets_client.py**
```python
import asyncio
from typing import List, Dict, Any
import structlog
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings

logger = structlog.get_logger(__name__)

class GoogleSheetsClient:
    def __init__(self):
        self.credentials = None
        self.service = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Google Sheets API client"""
        try:
            if not settings.google_sheets_credentials:
                logger.warning("Google Sheets credentials not configured")
                return
            
            self.credentials = Credentials.from_service_account_info(
                settings.google_sheets_credentials,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            
            self.service = build('sheets', 'v4', credentials=self.credentials)
            logger.info("Google Sheets client initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize Google Sheets client", error=str(e))
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def append_to_sheet(
        self, 
        spreadsheet_id: str, 
        sheet_name: str, 
        data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Append data to Google Sheets
        """
        if not self.service:
            return {"status": "error", "message": "Google Sheets not configured"}
        
        try:
            logger.info("Appending data to Google Sheets", 
                       spreadsheet_id=spreadsheet_id, 
                       sheet_name=sheet_name,
                       rows_count=len(data))
            
            if not data:
                return {"status": "success", "message": "No data to append"}
            
            # Prepare data for sheets (convert dict to list of values)
            headers = list(data[0].keys())
            values = [headers]  # Header row
            
            for row in data:
                values.append([str(row.get(header, "")) for header in headers])
            
            # Check if sheet exists, create if not
            await self._ensure_sheet_exists(spreadsheet_id, sheet_name)
            
            # Append data
            range_name = f"{sheet_name}!A:Z"
            
            body = {
                'values': values
            }
            
            result = self.service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body=body
            ).execute()
            
            logger.info("Data appended successfully to Google Sheets", 
                       updated_rows=result.get('updates', {}).get('updatedRows', 0))
            
            return {
                "status": "success",
                "message": f"Appended {len(data)} rows to {sheet_name}",
                "updated_rows": result.get('updates', {}).get('updatedRows', 0)
            }
            
        except HttpError as e:
            logger.error("Google Sheets API error", error=str(e))
            return {"status": "error", "message": f"Google Sheets error: {str(e)}"}
        except Exception as e:
            logger.error("Failed to append to Google Sheets", error=str(e))
            return {"status": "error", "message": f"Failed to append data: {str(e)}"}
    
    async def _ensure_sheet_exists(self, spreadsheet_id: str, sheet_name: str):
        """Ensure the sheet exists, create if it doesn't"""
        try:
            # Get existing sheets
            sheet_metadata = self.service.spreadsheets().get(
                spreadsheetId=spreadsheet_id
            ).execute()
            
            existing_sheets = [
                sheet['properties']['title'] 
                for sheet in sheet_metadata.get('sheets', [])
            ]
            
            if sheet_name not in existing_sheets:
                # Create new sheet
                request_body = {
                    'requests': [{
                        'addSheet': {
                            'properties': {
                                'title': sheet_name
                            }
                        }
                    }]
                }
                
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body=request_body
                ).execute()
                
                logger.info("Created new sheet", sheet_name=sheet_name)
                
        except Exception as e:
            logger.warning("Could not ensure sheet exists", error=str(e))

# Initialize client
sheets_client = GoogleSheetsClient()
```

### Step 8: FastAPI Main Application

**app/main.py**
```python
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import structlog
import uuid
import asyncio
from datetime import datetime
from typing import Dict, Any

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.security import RateLimitMiddleware, SecurityHeadersMiddleware
from app.models.schemas import (
    ScrapeRequest, SheetsRequest, NotionRequest, 
    ScrapeResponse, HealthResponse
)
from app.clients.apify_client import apify_client
from app.clients.sheets_client import sheets_client
from app.clients.notion_client import notion_client

# Setup logging
logger = setup_logging()

# Initialize FastAPI
app = FastAPI(
    title="Apollo.io Web Scraper",
    description="Dockerized web scraper for Apollo.io leads with Sheets and Notion integration",
    version="1.0.0"
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    RateLimitMiddleware, 
    calls=settings.rate_limit_requests, 
    period=settings.rate_limit_window
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# In-memory task storage (use Redis in production)
tasks: Dict[str, Dict[str, Any]] = {}

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main UI"""
    return FileResponse("app/static/index.html")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    services = {
        "apify": "ok" if settings.apify_api_token else "not_configured",
        "google_sheets": "ok" if settings.google_sheets_credentials else "not_configured",
        "notion": "ok" if settings.notion_token else "not_configured"
    }
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        services=services
    )

@app.post("/api/scrape", response_model=ScrapeResponse)
async def scrape_leads(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """Start lead scraping task"""
    task_id = str(uuid.uuid4())
    
    # Initialize task
    tasks[task_id] = {
        "status": "started",
        "message": "Scraping in progress...",
        "data": None,
        "total_count": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Start background task
    background_tasks.add_task(
        scrape_leads_background, 
        task_id, 
        request.urls, 
        request.lead_count, 
        [field.value for field in request.fields]
    )
    
    logger.info("Scraping task started", task_id=task_id, request=request.dict())
    
    return ScrapeResponse(
        task_id=task_id,
        status="started",
        message="Scraping task started successfully"
    )

@app.get("/api/scrape/{task_id}", response_model=ScrapeResponse)
async def get_scrape_status(task_id: str):
    """Get scraping task status"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks[task_id]
    return ScrapeResponse(
        task_id=task_id,
        status=task["status"],
        message=task["message"],
        data=task["data"],
        total_count=task["total_count"]
    )

@app.post("/api/sheets/sync")
async def sync_to_sheets(request: SheetsRequest):
    """Sync data to Google Sheets"""
    logger.info("Syncing to Google Sheets", 
               spreadsheet_id=request.spreadsheet_id,
               sheet_name=request.sheet_name,
               data_count=len(request.data))
    
    result = await sheets_client.append_to_sheet(
        request.spreadsheet_id,
        request.sheet_name,
        request.data
    )
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@app.post("/api/notion/sync")
async def sync_to_notion(request: NotionRequest):
    """Sync data to Notion database"""
    database_id = request.database_id or settings.notion_database_id
    
    if not database_id:
        raise HTTPException(status_code=400, detail="Notion database ID required")
    
    logger.info("Syncing to Notion", 
               database_id=database_id,
               data_count=len(request.data))
    
    result = await notion_client.upload_to_notion(request.data, database_id)
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

async def scrape_leads_background(
    task_id: str, 
    urls: list, 
    lead_count: int, 
    fields: list
):
    """Background task for scraping leads"""
    try:
        logger.info("Background scraping started", task_id=task_id)
        
        # Update task status
        tasks[task_id]["status"] = "processing"
        tasks[task_id]["message"] = "Scraping leads from Apollo.io..."
        
        # Perform scraping
        result = await apify_client.scrape_apollo_leads(urls, lead_count, fields)
        
        # Update task with results
        if result["status"] == "success":
            tasks[task_id]["status"] = "completed"
            tasks[task_id]["message"] = result["message"]
            tasks[task_id]["data"] = result["data"]
            tasks[task_id]["total_count"] = result["total_scraped"]
        else:
            tasks[task_id]["status"] = "failed"
            tasks[task_id]["message"] = result["message"]
        
        logger.info("Background scraping completed", 
                   task_id=task_id, 
                   status=tasks[task_id]["status"])
        
    except Exception as e:
        logger.error("Background scraping failed", task_id=task_id, error=str(e))
        tasks[task_id]["status"] = "failed"
        tasks[task_id]["message"] = f"Scraping failed: {str(e)}"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Step 9: Notion Client Implementation

**app/clients/notion_client.py**
```python
import os
import asyncio
from typing import List, Dict, Any, Optional
from notion_client import AsyncClient, APIResponseError
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings

logger = structlog.get_logger(__name__)

class NotionClient:
    def __init__(self):
        self.client = AsyncClient(auth=settings.notion_token) if settings.notion_token else None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def create_notion_page(self, properties: Dict[str, Any], database_id: str):
        """Create a single page in Notion database"""
        if not self.client:
            raise ValueError("Notion client not initialized")
        
        return await self.client.pages.create(
            parent={"database_id": database_id}, 
            properties=properties
        )
    
    async def upload_to_notion(
        self, 
        items: List[Dict[str, Any]], 
        database_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload multiple items to Notion database with batch processing and retry logic
        """
        if not self.client:
            return {"status": "error", "message": "Notion client not configured"}
        
        db_id = database_id or settings.notion_database_id
        if not db_id:
            return {"status": "error", "message": "Notion database ID not provided"}
        
        try:
            logger.info("Starting Notion upload", 
                       database_id=db_id, 
                       items_count=len(items))
            
            successful_uploads = 0
            failed_uploads = 0
            errors = []
            
            # Process items in batches to avoid rate limits
            batch_size = 5
            for i in range(0, len(items), batch_size):
                batch = items[i:i + batch_size]
                
                for item in batch:
                    try:
                        # Convert item to Notion properties format
                        properties = self._convert_to_notion_properties(item)
                        
                        # Create page
                        await self.create_notion_page(properties, db_id)
                        successful_uploads += 1
                        
                        logger.debug("Page created successfully", item_name=item.get("name", "Unknown"))
                        
                    except APIResponseError as e:
                        logger.error("Notion API error", error=str(e), item=item)
                        failed_uploads += 1
                        errors.append(f"API Error: {str(e)}")
                        
                    except Exception as e:
                        logger.error("Unexpected error", error=str(e), item=item)
                        failed_uploads += 1
                        errors.append(f"Error: {str(e)}")
                
                # Rate limiting between batches
                await asyncio.sleep(0.5)
            
            logger.info("Notion upload completed", 
                       successful=successful_uploads, 
                       failed=failed_uploads)
            
            return {
                "status": "success" if successful_uploads > 0 else "error",
                "message": f"Uploaded {successful_uploads} items to Notion. {failed_uploads} failures.",
                "successful_uploads": successful_uploads,
                "failed_uploads": failed_uploads,
                "errors": errors[:10]  # Limit error list
            }
            
        except Exception as e:
            logger.error("Failed to upload to Notion", error=str(e))
            return {"status": "error", "message": f"Upload failed: {str(e)}"}
    
    def _convert_to_notion_properties(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert scraped item to Notion database properties format
        """
        properties = {}
        
        # Handle common fields with appropriate Notion property types
        field_mappings = {
            "name": lambda x: {"title": [{"text": {"content": str(x)[:2000]}}]},  # Title field
            "email": lambda x: {"email": str(x) if x and "@" in str(x) else None},
            "phone": lambda x: {"phone_number": str(x)[:50]} if x else None,
            "company": lambda x: {"rich_text": [{"text": {"content": str(x)[:2000]}}]},
            "title": lambda x: {"rich_text": [{"text": {"content": str(x)[:2000]}}]},
            "location": lambda x: {"rich_text": [{"text": {"content": str(x)[:2000]}}]},
            "industry": lambda x: {"rich_text": [{"text": {"content": str(x)[:2000]}}]},
            "linkedin": lambda x: {"url": str(x)} if x and str(x).startswith("http") else None,
            "twitter": lambda x: {"url": str(x)} if x and str(x).startswith("http") else None,
            "website": lambda x: {"url": str(x)} if x and str(x).startswith("http") else None,
        }
        
        # Convert each field
        for field, value in item.items():
            if value and field in field_mappings:
                try:
                    converted = field_mappings[field](value)
                    if converted:
                        properties[field.title()] = converted
                except Exception as e:
                    logger.warning("Failed to convert field", field=field, error=str(e))
            elif value:  # Fallback for custom fields
                properties[field.title()] = {
                    "rich_text": [{"text": {"content": str(value)[:2000]}}]
                }
        
        # Ensure we have at least a title
        if "Name" not in properties:
            properties["Name"] = {"title": [{"text": {"content": "Unknown Lead"}}]}
        
        return properties

# Initialize client
notion_client = NotionClient()
```

### Step 10: Frontend Implementation

**app/static/index.html**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apollo.io Lead Scraper</title>
    
    <!-- CSS Libraries -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Custom Styles -->
    <link rel="stylesheet" href="/static/css/styles.css">
</head>
<body class="light-theme">
    <!-- Header -->
    <header class="header">
        <div class="header-content">
            <h1 class="logo animate__animated animate__fadeInDown">
                <i class="fas fa-search"></i>
                Apollo Lead Scraper
            </h1>
            <button id="themeToggle" class="theme-toggle" aria-label="Toggle theme">
                <i class="fas fa-moon"></i>
            </button>
        </div>
    </header>

    <!-- Main Container -->
    <main class="container animate__animated animate__fadeInUp">
        <!-- Left Panel - Configuration -->
        <div class="panel left-panel">
            <div class="panel-header">
                <h2><i class="fas fa-cog"></i> Configuration</h2>
            </div>
            
            <div class="form-section">
                <label for="urls">Apollo.io URLs</label>
                <textarea 
                    id="urls" 
                    placeholder="Enter Apollo.io URLs (one per line)&#10;https://app.apollo.io/#/people?..."
                    rows="4"
                ></textarea>
                <small>Enter 1-10 Apollo.io search URLs</small>
            </div>

            <div class="form-section">
                <label for="leadCount">Lead Count: <span id="leadCountValue">100</span></label>
                <input type="range" id="leadCount" min="1" max="1000" value="100" class="slider">
                <div class="slider-labels">
                    <span>1</span>
                    <span>1000+</span>
                </div>
            </div>

            <div class="form-section">
                <label>Fields to Extract</label>
                <div class="checkbox-grid">
                    <label class="checkbox-item">
                        <input type="checkbox" value="name" checked>
                        <span>Name</span>
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" value="email" checked>
                        <span>Email</span>
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" value="phone">
                        <span>Phone</span>
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" value="company">
                        <span>Company</span>
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" value="title">
                        <span>Title</span>
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" value="location">
                        <span>Location</span>
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" value="industry">
                        <span>Industry</span>
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" value="linkedin">
                        <span>LinkedIn</span>
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" value="twitter">
                        <span>Twitter</span>
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" value="website">
                        <span>Website</span>
                    </label>
                </div>
            </div>

            <button id="startScraping" class="btn btn-primary">
                <i class="fas fa-play"></i>
                Start Scraping
            </button>
        </div>

        <!-- Right Panel - API Configuration & Results -->
        <div class="panel right-panel">
            <!-- API Configuration -->
            <div class="panel-section">
                <div class="panel-header">
                    <h3><i class="fas fa-key"></i> API Configuration</h3>
                </div>
                
                <div class="form-section">
                    <label for="apifyToken">Apify API Token</label>
                    <input type="password" id="apifyToken" placeholder="Your Apify API token">
                </div>
                
                <div class="form-section">
                    <label for="googleSheets">Google Sheets ID</label>
                    <input type="text" id="googleSheets" placeholder="Google Sheets spreadsheet ID">
                </div>
                
                <div class="form-section">
                    <label for="notionToken">Notion Token</label>
                    <input type="password" id="notionToken" placeholder="Your Notion integration token">
                </div>
                
                <div class="form-section">
                    <label for="notionDbId">Notion Database ID</label>
                    <input type="text" id="notionDbId" placeholder="Notion database ID">
                </div>
            </div>

            <!-- Progress Section -->
            <div class="panel-section" id="progressSection" style="display: none;">
                <div class="panel-header">
                    <h3><i class="fas fa-chart-line"></i> Progress</h3>
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div class="progress-text" id="progressText">Ready to start...</div>
                </div>
            </div>

            <!-- Results Section -->
            <div class="panel-section" id="resultsSection" style="display: none;">
                <div class="panel-header">
                    <h3><i class="fas fa-table"></i> Results Preview</h3>
                </div>
                
                <div class="results-summary" id="resultsSummary"></div>
                
                <div class="table-container">
                    <table id="resultsTable">
                        <thead id="resultsTableHead"></thead>
                        <tbody id="resultsTableBody"></tbody>
                    </table>
                </div>

                <div class="action-buttons">
                    <button id="downloadCSV" class="btn btn-secondary">
                        <i class="fas fa-download"></i>
                        Download CSV
                    </button>
                    <button id="downloadJSON" class="btn btn-secondary">
                        <i class="fas fa-download"></i>
                        Download JSON
                    </button>
                    <button id="syncSheets" class="btn btn-success">
                        <i class="fab fa-google"></i>
                        Sync to Sheets
                    </button>
                    <button id="syncNotion" class="btn btn-info">
                        <i class="fas fa-database"></i>
                        Push to Notion
                    </button>
                </div>
            </div>
        </div>
    </main>

    <!-- Toast Notifications -->
    <div id="toastContainer" class="toast-container"></div>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay" style="display: none;">
        <div class="spinner"></div>
        <p>Processing your request...</p>
    </div>

    <!-- JavaScript Libraries -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    
    <!-- Custom JavaScript -->
    <script src="/static/js/app.js"></script>
</body>
</html>
```

**app/static/css/styles.css**
```css
/* CSS Variables for Theming */
:root {
    --primary-color: #6366f1;
    --primary-hover: #5855eb;
    --success-color: #10b981;
    --info-color: #3b82f6;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
    --secondary-color: #6b7280;
    
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --bg-tertiary: #f1f5f9;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --border-color: #e5e7eb;
    --shadow-light: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    --shadow-medium: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-heavy: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    
    --border-radius: 8px;
    --border-radius-lg: 12px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Dark Theme */
.dark-theme {
    --bg-primary: #111827;
    --bg-secondary: #1f2937;
    --bg-tertiary: #374151;
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --border-color: #374151;
    --shadow-light: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
    --shadow-medium: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    --shadow-heavy: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
}

/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-family);
    background: var(--bg-secondary);
    color: var(--text-primary);
    line-height: 1.6;
    transition: var(--transition);
    overflow-x: hidden;
}

/* Header */
.header {
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    padding: 1rem 0;
    box-shadow: var(--shadow-light);
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.theme-toggle {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: 0.5rem;
    cursor: pointer;
    transition: var(--transition);
    color: var(--text-primary);
}

.theme-toggle:hover {
    background: var(--primary-color);
    color: white;
    transform: scale(1.05);
}

/* Main Container */
.container {
    max-width: 1400px;
    margin: 2rem auto;
    padding: 0 2rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    min-height: calc(100vh - 120px);
}

/* Panels */
.panel {
    background: var(--bg-primary);
    border-radius: var(--border-radius-lg);
    padding: 2rem;
    box-shadow: var(--shadow-medium);
    border: 1px solid var(--border-color);
    transition: var(--transition);
    animation: slideInUp 0.6s ease-out;
}

.panel:hover {
    box-shadow: var(--shadow-heavy);
    transform: translateY(-2px);
}

.panel-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-color);
}

.panel-header h2,
.panel-header h3 {
    color: var(--text-primary);
    font-weight: 600;
}

.panel-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--bg-secondary);
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
}

/* Form Elements */
.form-section {
    margin-bottom: 1.5rem;
}

.form-section label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary);
}

.form-section input,
.form-section textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--bg-primary);
    color: var(--text-primary);
    transition: var(--transition);
    font-family: inherit;
}

.form-section input:focus,
.form-section textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-section small {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
}

/* Slider */
.slider {
    width: 100%;
    height: 8px;
    border-radius: 5px;
    background: var(--bg-tertiary);
    outline: none;
    -webkit-appearance: none;
    transition: var(--transition);
}

.slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
    box-shadow: var(--shadow-light);
    transition: var(--transition);
}

.slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: var(--shadow-medium);
}

.slider-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

/* Checkbox Grid */
.checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.checkbox-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: var(--border-radius);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: var(--transition);
}

.checkbox-item:hover {
    background: var(--bg-tertiary);
    transform: translateY(-1px);
}

.checkbox-item input[type="checkbox"] {
    width: auto;
    margin: 0;
    accent-color: var(--primary-color);
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: var(--border-radius);
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: var(--transition);
    font-family: inherit;
    font-size: 0.875rem;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-primary {
    background: var(--primary-color);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: var(--primary-hover);
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
}

.btn-secondary {
    background: var(--secondary-color);
    color: white;
}

.btn-success {
    background: var(--success-color);
    color: white;
}

.btn-info {
    background: var(--info-color);
    color: white;
}

.btn-secondary:hover:not(:disabled),
.btn-success:hover:not(:disabled),
.btn-info:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
    filter: brightness(110%);
}

#startScraping {
    width: 100%;
    font-size: 1rem;
    padding: 1rem;
    margin-top: 1rem;
}

/* Progress Bar */
.progress-container {
    margin: 1rem 0;
}

.progress-bar {
    width: 100%;
    height: 12px;
    background: var(--bg-tertiary);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color), var(--success-color));
    width: 0%;
    transition: width 0.3s ease;
    position: relative;
}

.progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
    );
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

.progress-text {
    text-align: center;
    margin-top: 0.5rem;
    font-weight: 500;
    color: var(--text-secondary);
}

/* Results Table */
.results-summary {
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: var(--border-radius);
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
}

.table-container {
    overflow-x: auto;
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
    margin-bottom: 1rem;
}

#resultsTable {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-primary);
}

#resultsTable th,
#resultsTable td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.875rem;
}

#resultsTable th {
    background: var(--bg-secondary);
    font-weight: 600;
    color: var(--text-primary);
    position: sticky;
    top: 0;
}

#resultsTable tr:hover {
    background: var(--bg-secondary);
}

/* Action Buttons */
.action-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
}

/* Toast Notifications */
.toast-container {
    position: fixed;
    top: 2rem;
    right: 2rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.toast {
    padding: 1rem 1.5rem;
    border-radius: var(--border-radius);
    color: white;
    font-weight: 500;
    box-shadow: var(--shadow-heavy);
    animation: slideInRight 0.3s ease-out;
    min-width: 300px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.toast.success { background: var(--success-color); }
.toast.error { background: var(--danger-color); }
.toast.warning { background: var(--warning-color); }
.toast.info { background: var(--info-color); }

.toast-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    margin-left: auto;
    font-size: 1.2rem;
    opacity: 0.8;
}

.toast-close:hover {
    opacity: 1;
}

/* Loading Overlay */
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    color: white;
    font-size: 1.2rem;
}

.spinner {
    width: 60px;
    height: 60px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-left: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Animations */
@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(100px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* Responsive Design */
@media (max-width: 1024px) {
    .container {
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }
    
    .header-content {
        padding: 0 1rem;
    }
    
    .container {
        padding: 0 1rem;
    }
    
    .panel {
        padding: 1.5rem;
    }
}

@media (max-width: 768px) {
    .checkbox-grid {
        grid-template-columns: 1fr;
    }
    
    .action-buttons {
        grid-template-columns: 1fr;
    }
    
    .toast-container {
        top: 1rem;
        right: 1rem;
        left: 1rem;
    }
    
    .toast {
        min-width: auto;
    }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-tertiary);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}
```

**app/static/js/app.js**
```javascript
class ApolloScraperApp {
    constructor() {
        this.currentTaskId = null;
        this.scrapedData = [];
        this.pollInterval = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeAnimations();
    }
    
    initializeElements() {
        // Form elements
        this.urlsInput = document.getElementById('urls');
        this.leadCountSlider = document.getElementById('leadCount');
        this.leadCountValue = document.getElementById('leadCountValue');
        this.fieldCheckboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
        
        // API configuration
        this.apifyTokenInput = document.getElementById('apifyToken');
        this.googleSheetsInput = document.getElementById('googleSheets');
        this.notionTokenInput = document.getElementById('notionToken');
        this.notionDbIdInput = document.getElementById('notionDbId');
        
        // Action buttons
        this.startScrapingBtn = document.getElementById('startScraping');
        this.downloadCSVBtn = document.getElementById('downloadCSV');  
        this.downloadJSONBtn = document.getElementById('downloadJSON');
        this.syncSheetsBtn = document.getElementById('syncSheets');
        this.syncNotionBtn = document.getElementById('syncNotion');
        this.themeToggleBtn = document.getElementById('themeToggle');
        
        // Progress and results
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsSummary = document.getElementById('resultsSummary');
        this.resultsTable = document.getElementById('resultsTable');
        this.resultsTableHead = document.getElementById('resultsTableHead');
        this.resultsTableBody = document.getElementById('resultsTableBody');
        
        // UI elements
        this.toastContainer = document.getElementById('toastContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }
    
    bindEvents() {
        // Lead count slider
        this.leadCountSlider.addEventListener('input', (e) => {
            this.leadCountValue.textContent = e.target.value;
            gsap.to(this.leadCountValue, {
                scale: 1.2,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
        });
        
        // Start scraping
        this.startScrapingBtn.addEventListener('click', () => this.startScraping());
        
        // Download buttons
        this.downloadCSVBtn.addEventListener('click', () => this.downloadData('csv'));
        this.downloadJSONBtn.addEventListener('click', () => this.downloadData('json'));
        
        // Sync buttons
        this.syncSheetsBtn.addEventListener('click', () => this.syncToSheets());
        this.syncNotionBtn.addEventListener('click', () => this.syncToNotion());
        
        // Theme toggle
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        
        // Form validation
        this.urlsInput.addEventListener('input', () => this.validateForm());
        this.fieldCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => this.validateForm());
        });
    }
    
    initializeAnimations() {
        // Animate panels on load
        gsap.from('.panel', {
            y: 50,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "power2.out"
        });
        
        // Animate checkboxes
        gsap.set('.checkbox-item', { scale: 0.95 });
        
        document.querySelectorAll('.checkbox-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                gsap.to(item, { scale: 1, duration: 0.2 });
            });
            
            item.addEventListener('mouseleave', () => {
                gsap.to(item, { scale: 0.95, duration: 0.2 });
            });
        });
    }
    
    validateForm() {
        const urls = this.urlsInput.value.trim().split('\n').filter(url => url.trim());
        const selectedFields = Array.from(this.fieldCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        const isValid = urls.length > 0 && 
                       urls.length <= 10 && 
                       selectedFields.length > 0 &&
                       urls.every(url => url.startsWith('http'));
        
        this.startScrapingBtn.disabled = !isValid;
        
        if (!isValid) {
            this.startScrapingBtn.style.opacity = '0.6';
        } else {
            this.startScrapingBtn.style.opacity = '1';
        }
    }
    
    async startScraping() {
        const urls = this.urlsInput.value.trim().split('\n')
            .filter(url => url.trim())
            .map(url => url.trim());
        
        const leadCount = parseInt(this.leadCountSlider.value);