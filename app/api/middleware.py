from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time
import structlog
from core.config import settings

logger = structlog.get_logger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging all requests"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request
        logger.info("Request started", 
                   method=request.method,
                   url=str(request.url),
                   client_ip=request.client.host if request.client else "unknown")
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        logger.info("Request completed",
                   method=request.method,
                   url=str(request.url),
                   status_code=response.status_code,
                   duration=f"{duration:.3f}s")
        
        return response

class TaskCleanupMiddleware(BaseHTTPMiddleware):
    """Middleware for cleaning up old tasks"""
    
    def __init__(self, app, cleanup_interval: int = 3600):  # 1 hour
        super().__init__(app)
        self.cleanup_interval = cleanup_interval
        self.last_cleanup = time.time()
    
    async def dispatch(self, request: Request, call_next):
        # Cleanup old tasks periodically
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            await self._cleanup_old_tasks()
            self.last_cleanup = current_time
        
        return await call_next(request)
    
    async def _cleanup_old_tasks(self):
        """Remove tasks older than 24 hours"""
        from app.api.routes import tasks_storage
        
        current_time = time.time()
        cutoff_time = current_time - (24 * 3600)  # 24 hours
        
        tasks_to_remove = []
        for task_id, task_data in tasks_storage.items():
            # Assume task creation time is stored or use current logic
            # For simplicity, remove completed/failed tasks older than cutoff
            if task_data.get("status") in ["completed", "failed"]:
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del tasks_storage[task_id]
            logger.info("Cleaned up old task", task_id=task_id)
