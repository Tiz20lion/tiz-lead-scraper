from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import time
from collections import defaultdict
import hmac
import hashlib
from core.config import settings

# Rate Limiting
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"

        # Skip rate limiting for static files and health check
        if (request.url.path.startswith("/static/") or 
            request.url.path.startswith("/css/") or 
            request.url.path.startswith("/js/") or
            request.url.path == "/health" or
            request.url.path == "/" or
            request.url.path.startswith("/api/v1/csrf-token")):
            return await call_next(request)

        now = time.time()

        # Clean old requests
        self.clients[client_ip] = [
            req_time for req_time in self.clients[client_ip]
            if now - req_time < self.period
        ]

        # Check rate limit
        if len(self.clients[client_ip]) >= 100:
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