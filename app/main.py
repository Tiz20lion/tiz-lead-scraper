from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from core.config import settings
from core.logging_config import setup_logging
from core.security import RateLimitMiddleware, SecurityHeadersMiddleware
from api.routes import router as api_router

# Setup logging
logger = setup_logging()

# Create FastAPI application
app = FastAPI(
    title="Apollo.io Lead Scraper",
    description="Production-ready web scraper for Apollo.io with Google Sheets and Notion integration",
    version="1.0.0",
    docs_url="/docs" if os.getenv("DEBUG", "false").lower() == "true" else None,
    redoc_url="/redoc" if os.getenv("DEBUG", "false").lower() == "true" else None
)

# Add security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    RateLimitMiddleware,
    calls=settings.rate_limit_requests,
    period=settings.rate_limit_window
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def serve_frontend():
    """Serve the main frontend application"""
    return FileResponse("app/static/index.html")

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
        logger.error("Health check failed", error=str(e))
        return {"status": "unhealthy", "error": str(e)}

@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    logger.info("Apollo.io Lead Scraper starting up", version="1.0.0")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    logger.info("Apollo.io Lead Scraper shutting down")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("DEBUG", "false").lower() == "true",
        access_log=True
    )
