import logging
import sys
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import (
    get_redoc_html,
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.openapi.utils import get_openapi
import uvicorn
import os

from app.core.config import settings
from app.utils.logging_config import setup_logging
from app.core.security import RateLimitMiddleware, SecurityHeadersMiddleware
from app.core.exceptions import ExternalAPIError, ExportError, AIAgentError, TaskStoreError
from app.api.routes import router as api_router

# Setup logging
logger = setup_logging()

# Get the directory paths
current_dir = Path(__file__).parent
static_dir = current_dir / "static"

# If static directory doesn't exist in app/, look in parent directory
if not static_dir.exists():
    static_dir = current_dir.parent / "static"

# Create FastAPI application with custom docs URLs
app = FastAPI(
    title="Tiz Lead Scraper",
    description="API for scraping leads from various sources",
    version="1.0.0",
    docs_url=None,  # Disable default docs
    redoc_url=None,  # Disable default redoc
    openapi_url="/openapi.json"  # Set OpenAPI URL to root level
)

# Add exception handlers for custom exceptions
@app.exception_handler(ExternalAPIError)
async def handle_external_api_error(request: Request, exc: ExternalAPIError):
    correlation_id = getattr(request.state, 'correlation_id', 'unknown')
    logger.error(f"ExternalAPIError occurred: {str(exc)} - correlation_id: {correlation_id}")
    return JSONResponse(
        status_code=502,
        content={"detail": "External service temporarily unavailable"}
    )

@app.exception_handler(ExportError)
async def handle_export_error(request: Request, exc: ExportError):
    correlation_id = getattr(request.state, 'correlation_id', 'unknown')
    logger.error(f"ExportError occurred: {str(exc)} - correlation_id: {correlation_id}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Export operation failed"}
    )

@app.exception_handler(AIAgentError)
async def handle_ai_agent_error(request: Request, exc: AIAgentError):
    correlation_id = getattr(request.state, 'correlation_id', 'unknown')
    logger.error(f"AIAgentError occurred: {str(exc)} - correlation_id: {correlation_id}")
    return JSONResponse(
        status_code=503,
        content={"detail": "AI service temporarily unavailable"}
    )

@app.exception_handler(TaskStoreError)
async def handle_task_store_error(request: Request, exc: TaskStoreError):
    correlation_id = getattr(request.state, 'correlation_id', 'unknown')
    logger.error(f"TaskStoreError occurred: {str(exc)} - correlation_id: {correlation_id}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Task storage operation failed"}
)

# Add security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    RateLimitMiddleware,
    calls=getattr(settings, 'rate_limit_requests', 100),
    period=getattr(settings, 'rate_limit_window', 60)
)

# Configure CORS - allow all for docs to work properly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes BEFORE mounting static files
app.include_router(api_router, prefix="/api/v1")

# Include AI agent router
try:
    from app.ai_agent.apollo_agent import router as apollo_router
    app.include_router(apollo_router, prefix="/api/v1/ai", tags=["Apollo URL Builder"])
    logger.info("AI agent router included successfully")
except ImportError as e:
    logger.warning(f"AI agent router not available: {str(e)}")

# Mount static files with directory listing enabled
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir), html=True), name="static")
    logger.info(f"Static files mounted from: {static_dir}")
else:
    logger.warning(f"Static directory not found at: {static_dir}")

# Custom docs endpoints that work offline
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=f"{app.title} - Swagger UI",
        oauth2_redirect_url=f"/docs/oauth2-redirect",
        swagger_js_url="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui-bundle.min.js",
        swagger_css_url="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui.min.css",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
    )

@app.get("/docs/oauth2-redirect", include_in_schema=False)
async def swagger_ui_redirect():
    return get_swagger_ui_oauth2_redirect_html()

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url="/openapi.json",
        title=f"{app.title} - ReDoc",
        redoc_js_url="https://cdnjs.cloudflare.com/ajax/libs/redoc/2.1.3/bundles/redoc.standalone.js",
        redoc_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
    )

@app.get("/")
async def serve_frontend():
    """Serve the main frontend application"""
    index_path = static_dir / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    else:
        return {"message": "Tiz Lead Scraper API is running", "version": "1.0.0", "docs": "/docs"}

@app.get("/debug/static")
async def debug_static():
    """Debug endpoint to check static files configuration"""
    import os
    static_files = []
    try:
        if static_dir.exists():
            for item in static_dir.iterdir():
                if item.is_file():
                    static_files.append(str(item.name))
                elif item.is_dir():
                    static_files.append(f"{item.name}/ (directory)")
    except Exception as e:
        return {"error": str(e)}
    
    return {
        "static_dir": str(static_dir),
        "static_dir_exists": static_dir.exists(),
        "files": static_files,
        "mount_info": "Static files mounted at /static with html=True",
        "test_urls": [
            "http://localhost:5000/static/index.html",
            "http://localhost:5000/static/css/",
            "http://localhost:5000/static/js/"
        ]
    }

@app.get("/static-list")
async def list_static_files():
    """List static files directory (alternative to /static/)"""
    if not static_dir.exists():
        return {"error": "Static directory not found"}
    
    files = []
    directories = []
    
    try:
        for item in static_dir.iterdir():
            if item.is_file():
                files.append({
                    "name": item.name,
                    "size": item.stat().st_size,
                    "url": f"/static/{item.name}"
                })
            elif item.is_dir():
                directories.append({
                    "name": item.name,
                    "type": "directory",
                    "url": f"/static/{item.name}/"
                })
    except Exception as e:
        return {"error": str(e)}
    
    return {
        "static_directory": str(static_dir),
        "directories": directories,
        "files": files,
        "total_files": len(files),
        "total_directories": len(directories)
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        return {
            "status": "healthy",
            "timestamp": "2024-01-01T00:00:00Z",
            "version": "1.0.0",
            "services": {
                "apify": "ready" if settings.apify_api_token else "not_configured",
                "google_sheets": "ready" if settings.google_sheets_credentials else "not_configured",
                "notion": "ready" if settings.notion_token else "not_configured"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {"status": "unhealthy", "error": str(e)}

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown")

if __name__ == "__main__":
    logger.info("Starting application server")
    uvicorn.run(app, host="0.0.0.0", port=5000)
