from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
import json
import csv
import io
import uuid
from typing import Dict, Any
import structlog

from models.schemas import (
    ScrapeRequest, 
    SheetsRequest, 
    NotionRequest, 
    ScrapeResponse,
    HealthResponse
)
from clients.apify_client import apify_client
from clients.sheets_client import sheets_client
from clients.notion_client import notion_client
from core.security import generate_csrf_token, verify_csrf_token
from core.config import settings

logger = structlog.get_logger(__name__)

router = APIRouter()

# In-memory task storage (in production, use Redis or similar)
tasks_storage: Dict[str, Dict[str, Any]] = {}

@router.get("/csrf-token")
async def get_csrf_token():
    """Get CSRF token for secure requests"""
    token = generate_csrf_token(settings.secret_key)
    return {"csrf_token": token}

@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_apollo_leads(
    request: ScrapeRequest, 
    background_tasks: BackgroundTasks
):
    """Start Apollo.io lead scraping task"""
    try:
        # Generate task ID
        task_id = str(uuid.uuid4())
        
        # Initialize task in storage
        tasks_storage[task_id] = {
            "status": "pending",
            "progress": 0,
            "message": "Task initiated",
            "data": None,
            "total_count": 0
        }
        
        # Start background scraping task
        background_tasks.add_task(
            scrape_leads_background,
            task_id,
            request.urls,
            request.lead_count,
            [field.value for field in request.fields],
            request.apify_token
        )
        
        logger.info("Scraping task started", task_id=task_id, urls=request.urls)
        
        return ScrapeResponse(
            task_id=task_id,
            status="started",
            message="Scraping task initiated successfully"
        )
        
    except Exception as e:
        logger.error("Failed to start scraping task", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start scraping: {str(e)}")

@router.get("/scrape/{task_id}")
async def get_scrape_status(task_id: str):
    """Get scraping task status and results"""
    if task_id not in tasks_storage:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks_storage[task_id]
    
    return {
        "task_id": task_id,
        "status": task["status"],
        "progress": task["progress"],
        "message": task["message"],
        "data": task["data"],
        "total_count": task["total_count"]
    }

@router.post("/export/sheets")
async def export_to_sheets(request: SheetsRequest):
    """Export data to Google Sheets"""
    try:
        logger.info("Exporting to Google Sheets", 
                   spreadsheet_id=request.spreadsheet_id,
                   sheet_name=request.sheet_name)
        
        # Create Google Sheets client with user's credentials
        from clients.sheets_client import GoogleSheetsClient
        user_sheets_client = GoogleSheetsClient()
        
        # Override credentials with user-provided ones
        from googleapiclient.discovery import build
        from google.oauth2.service_account import Credentials
        
        credentials = Credentials.from_service_account_info(
            request.google_credentials,
            scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        user_sheets_client.service = build('sheets', 'v4', credentials=credentials)
        
        result = await user_sheets_client.append_to_sheet(
            spreadsheet_id=request.spreadsheet_id,
            sheet_name=request.sheet_name,
            data=request.data
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to export to Google Sheets", error=str(e))
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/export/notion")
async def export_to_notion(request: NotionRequest):
    """Export data to Notion database"""
    try:
        logger.info("Exporting to Notion", 
                   database_id=request.database_id,
                   entries=len(request.data))
        
        # Create Notion client with user's token
        from clients.notion_client import NotionClient
        from notion_client import AsyncClient
        
        user_notion_client = NotionClient()
        user_notion_client.client = AsyncClient(auth=request.notion_token)
        
        result = await user_notion_client.create_database_entries(
            data=request.data,
            database_id=request.database_id
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to export to Notion", error=str(e))
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.get("/export/csv/{task_id}")
async def export_csv(task_id: str):
    """Export task results as CSV with proper formatting"""
    if task_id not in tasks_storage:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks_storage[task_id]
    if not task["data"]:
        raise HTTPException(status_code=400, detail="No data available for export")
    
    try:
        # Create CSV content with cleaned data
        output = io.StringIO()
        if task["data"]:
            # Clean and validate data before export
            cleaned_data = _clean_export_data(task["data"])
            if cleaned_data:
                writer = csv.DictWriter(output, fieldnames=cleaned_data[0].keys())
                writer.writeheader()
                writer.writerows(cleaned_data)
        
        csv_content = output.getvalue()
        output.close()
        
        # Return as streaming response
        def generate():
            yield csv_content
        
        return StreamingResponse(
            generate(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=leads_{task_id}.csv"}
        )
        
    except Exception as e:
        logger.error("Failed to export CSV", error=str(e))
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")

@router.get("/export/json/{task_id}")
async def export_json(task_id: str):
    """Export task results as JSON"""
    if task_id not in tasks_storage:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks_storage[task_id]
    if not task["data"]:
        raise HTTPException(status_code=400, detail="No data available for export")
    
    try:
        # Return as streaming response
        def generate():
            yield json.dumps(task["data"], indent=2)
        
        return StreamingResponse(
            generate(),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=leads_{task_id}.json"}
        )
        
    except Exception as e:
        logger.error("Failed to export JSON", error=str(e))
        raise HTTPException(status_code=500, detail=f"JSON export failed: {str(e)}")

@router.get("/notion/database-info")
async def get_notion_database_info(database_id: str = None):
    """Get Notion database information"""
    try:
        result = await notion_client.get_database_info(database_id)
        return result
        
    except Exception as e:
        logger.error("Failed to get Notion database info", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get database info: {str(e)}")

def _clean_export_data(data: List[Dict]) -> List[Dict]:
    """Clean and validate data before export"""
    cleaned_data = []
    
    for item in data:
        cleaned_item = {}
        for key, value in item.items():
            # Ensure value is string and properly formatted
            if value is None:
                cleaned_item[key] = ""
            elif isinstance(value, str):
                # Remove any problematic characters for CSV/cloud export
                cleaned_value = value.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
                cleaned_value = ' '.join(cleaned_value.split())  # Remove extra whitespace
                cleaned_item[key] = cleaned_value
            else:
                cleaned_item[key] = str(value)
        
        # Only include items with at least one non-empty field
        if any(val.strip() for val in cleaned_item.values() if isinstance(val, str)):
            cleaned_data.append(cleaned_item)
    
    return cleaned_data

async def scrape_leads_background(
    task_id: str, 
    urls: list, 
    lead_count: int, 
    fields: list,
    apify_token: str
):
    """Background task for scraping leads"""
    try:
        # Update task status
        tasks_storage[task_id]["status"] = "running"
        tasks_storage[task_id]["progress"] = 10
        tasks_storage[task_id]["message"] = "Initializing scraper..."
        
        # Create client with user's token
        from clients.apify_client import ApifyApolloClient
        from apify_client import ApifyClient
        
        user_apify_client = ApifyApolloClient()
        user_apify_client.client = ApifyClient(apify_token)
        
        # Perform scraping
        result = await user_apify_client.scrape_apollo_leads(
            urls=urls,
            lead_count=lead_count,
            fields=fields
        )
        
        # Update task with results
        if result["status"] == "success":
            # Clean the data before storing
            cleaned_data = _clean_export_data(result["data"]) if result["data"] else []
            
            tasks_storage[task_id]["status"] = "completed"
            tasks_storage[task_id]["progress"] = 100
            tasks_storage[task_id]["message"] = result["message"]
            tasks_storage[task_id]["data"] = cleaned_data
            tasks_storage[task_id]["total_count"] = len(cleaned_data)
        else:
            tasks_storage[task_id]["status"] = "failed"
            tasks_storage[task_id]["progress"] = 0
            tasks_storage[task_id]["message"] = result["message"]
            
        logger.info("Background scraping task completed", 
                   task_id=task_id, 
                   status=result["status"])
        
    except Exception as e:
        logger.error("Background scraping task failed", 
                    task_id=task_id, 
                    error=str(e))
        
        tasks_storage[task_id]["status"] = "failed"
        tasks_storage[task_id]["progress"] = 0
        tasks_storage[task_id]["message"] = f"Scraping failed: {str(e)}"
