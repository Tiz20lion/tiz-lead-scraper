from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import structlog
import json
import csv
import io
import os
import secrets
from datetime import datetime

from models.schemas import ScrapeRequest, SheetsRequest, NotionRequest
from clients.apify_client import ApifyClient
from clients.sheets_client import GoogleSheetsClient  
from clients.notion_client import NotionClient

router = APIRouter(prefix="/api/v1")
logger = structlog.get_logger(__name__)

@router.get("/csrf-token")
async def get_csrf_token():
    """Generate and return a CSRF token"""
    token = secrets.token_urlsafe(32)
    return JSONResponse(content={"csrf_token": token})