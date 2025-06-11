from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from fastapi.responses import StreamingResponse
from fastapi.exceptions import RequestValidationError
import json
import csv
import io
import uuid
import asyncio
import time
from typing import Dict, Any, List
import logging

from app.models.schemas import (
    ScrapeRequest, 
    SheetsRequest, 
    NotionRequest, 
    ScrapeResponse,
    HealthResponse
)
from app.clients.apify_client import apify_client
from app.clients.sheets_client import sheets_client
from app.clients.notion_client import notion_client
from app.core.security import generate_csrf_token, verify_csrf_token
from app.core.config import settings
from app.utils.logging_config import setup_logging

# Setup logging
logger = setup_logging()

router = APIRouter()

# Test route to verify router is working
@router.get("/test")
async def test_route():
    """Test route to verify API router is working"""
    return {"message": "API router is working", "status": "success"}

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
        # Debug logging to help diagnose 422 error
        logger.info(f"Successfully received scraping request: urls={request.urls}, lead_count={request.lead_count}, fields={request.fields}, apify_token={'***' if request.apify_token else 'None'}")

        # Generate task ID
        task_id = str(uuid.uuid4())

        # Initialize task in storage
        tasks_storage[task_id] = {
            "status": "pending",
            "progress": 0,
            "message": "Task initiated",
            "data": None,
            "total_count": 0,
            "current_url": None,
            "scraped_count": 0,
            "urls_processed": 0,
            "total_urls": len(request.urls),
            "start_time": None,
            "estimated_time": "--:--",
            "processing_rate": 0,
            "error_count": 0,
            "total_attempts": 0
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

        logger.info(f"Scraping task started - task_id: {task_id}, urls: {request.urls}")

        return ScrapeResponse(
            task_id=task_id,
            status="started",
            message="Scraping task initiated successfully"
        )

    except Exception as e:
        logger.error(f"Failed to start scraping task: {str(e)}")
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
        logger.info(f"Exporting to Google Sheets - spreadsheet_id: {request.spreadsheet_id}, sheet_name: {request.sheet_name}")

        # Create Google Sheets client with user's credentials
        from app.clients.sheets_client import GoogleSheetsClient
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
        logger.error(f"Failed to export to Google Sheets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/export/notion")
async def export_to_notion(request: NotionRequest):
    """Export data to Notion database"""
    try:
        logger.info(f"Exporting to Notion - database_id: {request.database_id}, entries: {len(request.data)}")

        # Use the updated client method that handles URL extraction and token passing
        result = await notion_client.create_database_entries(
            data=request.data,
            database_id=request.database_id,
            notion_token=request.notion_token
        )

        return result

    except Exception as e:
        logger.error(f"Failed to export to Notion: {str(e)}")
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
        logger.error(f"Failed to export CSV: {str(e)}")
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
        logger.error(f"Failed to export JSON: {str(e)}")
        raise HTTPException(status_code=500, detail=f"JSON export failed: {str(e)}")

@router.get("/notion/database-info")
async def get_notion_database_info(database_id: str = None, notion_token: str = None):
    """Get Notion database information"""
    try:
        result = await notion_client.get_database_info(database_id, notion_token)
        return result

    except Exception as e:
        logger.error(f"Failed to get Notion database info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get database info: {str(e)}")

@router.get("/notion/validate-schema")
async def validate_notion_schema(database_id: str = None, notion_token: str = None):
    """Validate Notion database schema for lead scraping"""
    try:
        result = await notion_client.validate_database_schema(database_id, notion_token)
        return result

    except Exception as e:
        # Log detailed error information
        error_details = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "database_id": database_id,
            "token_provided": bool(notion_token)
        }
        
        if hasattr(e, 'body'):
            error_details["notion_error_body"] = e.body
        if hasattr(e, 'code'):
            error_details["notion_error_code"] = e.code
        if hasattr(e, 'response'):
            try:
                error_details["status_code"] = e.response.status_code
                error_details["response_text"] = e.response.text
            except:
                pass
        
        logger.error(f"Failed to validate Notion schema - details: {error_details}")
        raise HTTPException(status_code=500, detail=f"Failed to validate schema: {str(e)}")

@router.get("/notion/test-connection")
async def test_notion_connection(notion_token: str = None):
    """Test basic Notion API connectivity"""
    try:
        from notion_client import AsyncClient
        
        # Use provided token or fallback to settings
        auth_token = notion_token or settings.notion_token
        
        if not auth_token:
            return {
                "status": "error",
                "message": "No Notion token provided"
            }
        
        # Test basic API connectivity
        client = AsyncClient(auth=auth_token, notion_version="2022-06-28")
        
        # Try to list databases (this requires minimal permissions)
        try:
            response = await client.search(filter={"property": "object", "value": "database"})
            return {
                "status": "success",
                "message": "Notion API connection successful",
                "databases_found": len(response.get("results", [])),
                "token_valid": True
            }
        except Exception as api_error:
            return {
                "status": "error",
                "message": f"Notion API error: {str(api_error)}",
                "token_valid": False,
                "error_details": {
                    "error_type": type(api_error).__name__,
                    "error_message": str(api_error)
                }
            }
            
    except Exception as e:
        logger.error(f"Failed to test Notion connection: {str(e)}")
        return {
            "status": "error",
            "message": f"Connection test failed: {str(e)}"
        }

@router.get("/debug/last-task/{task_id}")
async def debug_last_task(task_id: str):
    """Debug endpoint to get the complete task storage data"""
    try:
        if task_id not in tasks_storage:
            return {
                "error": f"Task {task_id} not found",
                "available_tasks": list(tasks_storage.keys())
            }

        task_data = tasks_storage[task_id]

        # Create a safe copy for debugging
        debug_data = {
            "task_id": task_id,
            "status": task_data.get("status"),
            "progress": task_data.get("progress"),
            "message": task_data.get("message"),
            "total_count": task_data.get("total_count"),
            "scraped_count": task_data.get("scraped_count"),
            "urls_processed": task_data.get("urls_processed"),
            "total_urls": task_data.get("total_urls"),
            "error_count": task_data.get("error_count"),
            "data_length": len(task_data.get("data", [])),
            "data_sample": task_data.get("data", [])[:2] if task_data.get("data") else None,  # First 2 items only
            "raw_data_length": len(task_data.get("raw_data", [])) if task_data.get("raw_data") else 0,
            "has_data": bool(task_data.get("data")),
            "data_type": type(task_data.get("data")).__name__ if task_data.get("data") is not None else "None"
        }

        return debug_data

    except Exception as e:
        logger.error(f"Debug endpoint error: {str(e)}", exc_info=True)
        return {"error": str(e)}

@router.get("/debug/all-tasks")
async def debug_all_tasks():
    """Debug endpoint to see all task IDs and their basic info"""
    try:
        tasks_info = {}
        for task_id, task_data in tasks_storage.items():
            tasks_info[task_id] = {
                "status": task_data.get("status"),
                "progress": task_data.get("progress"),
                "total_count": task_data.get("total_count", 0),
                "data_length": len(task_data.get("data", [])),
                "has_data": bool(task_data.get("data"))
            }

        return {
            "total_tasks": len(tasks_storage),
            "tasks": tasks_info
        }

    except Exception as e:
        logger.error(f"Debug all tasks endpoint error: {str(e)}", exc_info=True)
        return {"error": str(e)}

@router.get("/sse/progress/{task_id}")
async def sse_progress(task_id: str, request: Request):
    """
    Enhanced SSE endpoint that streams real-time progress updates with Apify log integration
    """
    async def event_generator():
        last_sent = -1
        last_message = ""
        last_scraped_count = 0
        connection_established = False
        
        # Send initial connection event
        yield f"data: {json.dumps({'connection': 'established', 'message': 'Connected to real-time progress stream'})}\n\n"
        
        while True:
            try:
                # Stop if client disconnected
                if await request.is_disconnected():
                    logger.info(f"SSE client disconnected for task {task_id}")
                    break

                # Get task from storage
                task = tasks_storage.get(task_id)
                if not task:
                    # Send an error event and close
                    yield f"data: {json.dumps({'error': 'Task not found', 'detail': 'Task not found'})}\n\n"
                    break

                pct = task.get("progress", 0)
                msg = task.get("message", "")
                status = task.get("status", "")
                scraped_count = task.get("scraped_count", 0)

                # Send update if any significant change occurred
                if (pct != last_sent or 
                    msg != last_message or 
                    scraped_count != last_scraped_count or
                    not connection_established):
                    
                    # Calculate additional metrics
                    start_time = task.get("start_time")
                    elapsed_time = time.time() - start_time if start_time else 0
                    
                    payload = {
                        "percentage": pct, 
                        "message": msg,
                        "status": status,
                        "urls_processed": task.get("urls_processed", 0),
                        "total_urls": task.get("total_urls", 0),
                        "scraped_count": scraped_count,
                        "current_url": task.get("current_url", ""),
                        "estimated_time": task.get("estimated_time", "--:--"),
                        "processing_rate": task.get("processing_rate", 0),
                        "error_count": task.get("error_count", 0),
                        "total_count": task.get("total_count", 0),
                        "elapsed_time": elapsed_time,
                        "connection_status": "connected",
                        "timestamp": time.time()
                    }
                    
                    yield f"data: {json.dumps(payload)}\n\n"
                    
                    last_sent = pct
                    last_message = msg
                    last_scraped_count = scraped_count
                    connection_established = True
                    
                    logger.debug(f"SSE update sent for task {task_id}: {pct}% - {msg}")

                # If task completed or failed, send final update and close
                if status in ["completed", "failed"] or pct >= 100:
                    # Send final completion event
                    final_payload = {
                        "percentage": 100 if status == "completed" else pct,
                        "message": msg,
                        "status": status,
                        "final": True,
                        "connection_status": "completed"
                    }
                    yield f"data: {json.dumps(final_payload)}\n\n"
                    logger.info(f"SSE stream completed for task {task_id} with status: {status}")
                    break

                # Short interval for responsive real-time updates
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"SSE error for task {task_id}: {str(e)}")
                error_payload = {
                    "error": "Stream error",
                    "message": str(e),
                    "connection_status": "error"
                }
                yield f"data: {json.dumps(error_payload)}\n\n"
                break

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

def _clean_export_data(data: List[Dict]) -> List[Dict]:
    """Clean and validate data before export with proper phone formatting"""
    cleaned_data = []

    for item in data:
        cleaned_item = {}
        for key, value in item.items():
            if value is None:
                cleaned_item[key] = ""
            elif key.lower() == 'phone' and isinstance(value, str):
                # Format phone numbers to prevent scientific notation
                # Add apostrophe prefix to force text interpretation in Excel/Google Sheets
                formatted_phone = _format_phone_for_export(value)
                cleaned_item[key] = formatted_phone
            elif isinstance(value, str):
                # Remove problematic characters for CSV/cloud export
                cleaned_value = value.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
                cleaned_value = ' '.join(cleaned_value.split())  # Remove extra whitespace
                cleaned_item[key] = cleaned_value
            else:
                cleaned_item[key] = str(value)

        # Only include items with at least one non-empty field
        if any(val.strip() for val in cleaned_item.values() if isinstance(val, str)):
            cleaned_data.append(cleaned_item)

    return cleaned_data

def _format_phone_for_export(phone: str) -> str:
    """Format phone number for CSV/Excel export to prevent scientific notation"""
    if not phone or not isinstance(phone, str):
        return ""

    phone = phone.strip()
    if not phone:
        return ""

    # Validate phone format first
    if not _validate_phone_format(phone):
        logger.debug(f"Invalid phone format rejected for export: '{phone}'")
        return f"'{phone}" if phone else ""  # Still prefix with apostrophe for safety

    # Format to international standard if possible
    formatted_phone = _format_international_phone(phone)

    # Add apostrophe prefix to force text interpretation in Excel/Google Sheets
    return f"'{formatted_phone}"

def _validate_phone_format(phone: str) -> bool:
    """Validate phone number format"""
    if not phone or not isinstance(phone, str):
        return False

    # Remove formatting to get digits only
    import re
    digits_only = ''.join(filter(str.isdigit, phone))

    # Should have between 7-15 digits for valid international numbers
    # 7 digits minimum for local numbers, 15 maximum per ITU-T E.164
    return 7 <= len(digits_only) <= 15

def _format_international_phone(phone: str, default_country_code: str = "+1") -> str:
    """Format phone to international standard"""
    if not phone:
        return ""

    import re

    # Clean the phone number but preserve + sign
    phone = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "").replace(".", "")

    # Already in international format with +
    if phone.startswith("+"):
        return phone

    # European format with 00 prefix (e.g. 00441625505300)
    elif phone.startswith("00"):
        return f"+{phone[2:]}"

    # US/Canada format with leading 1 (e.g. 14155551234)
    elif len(phone) == 11 and phone.startswith("1"):
        return f"+{phone}"

    # Standard US/Canada format without country code (e.g. 4155551234)
    elif len(phone) == 10:
        return f"{default_country_code}{phone}"

    # For other formats, try to determine if it needs a country code
    elif len(phone) >= 7:
        # If it looks like it might need a country code (7-10 digits), add default
        if len(phone) <= 10:
            return f"{default_country_code}{phone}"
        else:
            # Assume it already includes country code, just add +
            return f"+{phone}"

    # Return as-is if we can't determine format
    return phone

async def scrape_leads_background(
    task_id: str, 
    urls: list, 
    lead_count: int, 
    fields: list,
    apify_token: str
):
    """Enhanced background task with real-time Apify log integration"""
    import time
    import asyncio

    start_time = time.time()
    total_urls = len(urls)

    try:
        # Initialize task with enhanced progress tracking
        tasks_storage[task_id].update({
            "status": "running",
            "progress": 5,
            "message": "Initializing Apollo.io scraper...",
            "current_url": None,
            "scraped_count": 0,
            "urls_processed": 0,
            "total_urls": total_urls,
            "start_time": start_time,
            "estimated_time": "--:--",
            "processing_rate": 0,
            "error_count": 0,
            "total_attempts": 0,
            "apify_run_id": None,
            "apify_log_url": None
        })

        # Brief pause for UI to register the initial state
        await asyncio.sleep(1)

        # Create progress callback for real-time updates
        async def progress_callback(progress_data):
            """Callback to update task storage with real-time Apify progress"""
            if not progress_data:
                return
                
            current_task = tasks_storage.get(task_id, {})
            
            # Update with Apify progress data
            updates = {}
            
            if 'percentage' in progress_data:
                updates['progress'] = progress_data['percentage']
            
            if 'message' in progress_data:
                updates['message'] = progress_data['message']
            elif 'current_page' in progress_data:
                updates['message'] = f"Processing page {progress_data['current_page']}..."
            
            if 'records_found' in progress_data:
                updates['scraped_count'] = progress_data['records_found']
            
            if 'current_url' in progress_data:
                updates['current_url'] = progress_data['current_url']
            
            if 'processing_rate' in progress_data:
                updates['processing_rate'] = progress_data['processing_rate']
            
            if 'estimated_time' in progress_data:
                updates['estimated_time'] = progress_data['estimated_time']
            
            if 'has_errors' in progress_data and progress_data['has_errors']:
                updates['error_count'] = current_task.get('error_count', 0) + 1
            
            # Update task storage
            current_task.update(updates)
            tasks_storage[task_id] = current_task
            
            logger.debug(f"Real-time progress update for task {task_id}: {updates}")

        # Create client with user's token
        from app.clients.apify_client import ApifyApolloClient

        # Pass the token directly to the constructor
        user_apify_client = ApifyApolloClient(apify_token=apify_token)

        # Update progress - Starting scraping
        tasks_storage[task_id].update({
            "progress": 10,
            "message": "Connecting to Apollo.io..."
        })
        await asyncio.sleep(0.5)

        all_scraped_data = []
        total_scraped = 0

        # Process each URL with detailed progress tracking
        for url_index, url in enumerate(urls):
            try:
                # Update current URL being processed
                current_progress = 10 + (url_index / total_urls) * 80
                elapsed_time = time.time() - start_time

                # Calculate ETA
                if url_index > 0:
                    avg_time_per_url = elapsed_time / url_index
                    remaining_urls = total_urls - url_index
                    eta_seconds = remaining_urls * avg_time_per_url
                    eta_minutes = int(eta_seconds // 60)
                    eta_seconds = int(eta_seconds % 60)
                    estimated_time = f"{eta_minutes:02d}:{eta_seconds:02d}"
                else:
                    estimated_time = "--:--"

                tasks_storage[task_id].update({
                    "progress": int(current_progress),
                    "message": f"Scraping URL {url_index + 1} of {total_urls}...",
                    "current_url": url,
                    "urls_processed": url_index,
                    "estimated_time": estimated_time,
                    "total_attempts": tasks_storage[task_id]["total_attempts"] + 1
                })

                # Calculate how many leads we need from this URL
                remaining_leads = lead_count - total_scraped
                if remaining_leads <= 0:
                    logger.info(f"Target lead count {lead_count} already reached. Skipping remaining URLs.")
                    break

                # Perform scraping for this URL - limit to remaining needed
                url_lead_count = min(remaining_leads, lead_count // total_urls + 100)

                # Update message for active scraping
                tasks_storage[task_id]["message"] = f"Extracting leads from {url[:50]}..."

                # DEBUG: Log the scraping attempt
                logger.info(f"DEBUG: Attempting to scrape URL {url_index + 1}: {url[:100]}...")
                logger.info(f"DEBUG: Requesting {url_lead_count} leads with fields: {fields}")

                result = await user_apify_client.scrape_apollo_leads(
                    urls=[url],
                    lead_count=url_lead_count,
                    fields=fields
                )

                # DEBUG: Log the raw result from Apify
                logger.info(f"DEBUG: Apify result status: {result.get('status')}")
                logger.info(f"DEBUG: Apify result data length: {len(result.get('data', []))}")
                if result.get('data') and len(result['data']) > 0:
                    logger.info(f"DEBUG: Sample Apify lead: {result['data'][0]}")

                if result["status"] == "success" and result["data"]:
                    # Clean and add data
                    cleaned_data = _clean_export_data(result["data"])

                    # DEBUG: Log the cleaning process
                    logger.info(f"DEBUG: Before cleaning: {len(result['data'])} items")
                    logger.info(f"DEBUG: After cleaning: {len(cleaned_data)} items")
                    if cleaned_data:
                        logger.info(f"DEBUG: Sample cleaned lead: {cleaned_data[0]}")

                    all_scraped_data.extend(cleaned_data)
                    total_scraped += len(cleaned_data)

                    # Update scraped count with current totals
                    tasks_storage[task_id].update({
                        "scraped_count": total_scraped,
                        "urls_processed": url_index + 1,
                        "message": f"Found {len(cleaned_data)} leads from URL {url_index + 1}. Total: {total_scraped} leads"
                    })

                    # Calculate processing rate
                    if elapsed_time > 0:
                        processing_rate = round((total_scraped / elapsed_time) * 60)  # leads per minute
                        tasks_storage[task_id]["processing_rate"] = processing_rate
                else:
                    # Handle URL with no results
                    logger.warning(f"DEBUG: No results from URL {url_index + 1}: {result.get('message', 'Unknown error')}")
                    tasks_storage[task_id].update({
                        "urls_processed": url_index + 1,
                        "error_count": tasks_storage[task_id]["error_count"] + 1,
                        "message": f"No leads found from URL {url_index + 1}. Total: {total_scraped} leads"
                    })

                # Brief pause to allow UI updates
                await asyncio.sleep(0.3)

                # Check if we've reached our target
                if total_scraped >= lead_count:
                    logger.info(f"Target lead count {lead_count} reached. Stopping URL processing.")
                    break

            except Exception as url_error:
                logger.error(f"Error processing URL {url}: {str(url_error)}", exc_info=True)
                tasks_storage[task_id].update({
                    "error_count": tasks_storage[task_id]["error_count"] + 1,
                    "message": f"Error with URL {url_index + 1}, continuing with next..."
                })
                await asyncio.sleep(0.5)

        # Final processing and completion
        tasks_storage[task_id].update({
            "progress": 95,
            "message": "Finalizing results and cleaning data..."
        })
        await asyncio.sleep(1)

        # Final data processing
        final_data = all_scraped_data[:lead_count]  # Limit to requested count
        final_count = len(final_data)

        # DEBUG: Log the final data before storing
        logger.info(f"DEBUG: Final processing complete")
        logger.info(f"DEBUG: Total scraped data: {len(all_scraped_data)} items")
        logger.info(f"DEBUG: Final data (after limit): {final_count} items")
        logger.info(f"DEBUG: Final data sample: {final_data[0] if final_data else 'No data'}")

        # Calculate final metrics
        total_elapsed = time.time() - start_time
        final_rate = round((final_count / total_elapsed) * 60) if total_elapsed > 0 else 0

        # Complete the task
        tasks_storage[task_id].update({
            "status": "completed",
            "progress": 100,
            "message": f"Scraping completed! Successfully extracted {final_count} leads",
            "data": final_data,
            "total_count": final_count,
            "scraped_count": final_count,
            "urls_processed": total_urls,
            "processing_rate": final_rate,
            "estimated_time": "00:00"
        })

        # FINAL DEBUG: Log the complete task storage entry
        logger.info(f"DEBUG: Task {task_id} completed successfully")
        logger.info(f"DEBUG: Stored data length: {len(tasks_storage[task_id].get('data', []))}")
        logger.info(f"DEBUG: Task status: {tasks_storage[task_id]['status']}")

        logger.info(f"Enhanced background scraping task completed - task_id: {task_id}, total_scraped: {final_count}, elapsed_time: {total_elapsed}")

    except Exception as e:
        logger.error(f"Enhanced background scraping task failed - task_id: {task_id}, error: {str(e)}", exc_info=True)

        tasks_storage[task_id].update({
            "status": "failed",
            "progress": 0,
            "message": f"Scraping failed: {str(e)}",
            "error_count": tasks_storage[task_id].get("error_count", 0) + 1
        })

@router.post("/debug/test-request")
async def test_request(request: Request):
    """Debug endpoint to test request handling"""
    try:
        raw_body = await request.body()
        raw_data = json.loads(raw_body.decode())
        logger.info(f"Debug endpoint received: {raw_data}")
        return {"status": "success", "received": raw_data}
    except Exception as e:
        logger.error(f"Debug endpoint error: {e}")
        return {"status": "error", "error": str(e)}

@router.post("/scrape-test")
async def scrape_test(request: Request):
    """Test endpoint with no validation"""
    try:
        raw_body = await request.body()
        raw_data = json.loads(raw_body.decode())
        logger.info(f"SCRAPE TEST - Received data: {raw_data}")
        return {"status": "success", "message": "Test endpoint reached", "data": raw_data}
    except Exception as e:
        logger.error(f"SCRAPE TEST - Error: {e}")
        return {"status": "error", "error": str(e)}