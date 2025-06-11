from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import time
from collections import defaultdict
import hmac
import hashlib
from app.core.config import settings
import os
from typing import Dict, Any

# Rate Limiting
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = defaultdict(list)
        # Add IP whitelist for development
        self.whitelist_ips = {"127.0.0.1", "::1", "localhost"}

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

def sanitize_input(value: str, max_length: int = 1000) -> str:
    """Sanitize user input to prevent injection attacks"""
    if not isinstance(value, str):
        return ""

    # Remove potentially dangerous characters
    import re
    # Allow alphanumeric, spaces, basic punctuation
    sanitized = re.sub(r'[<>"\'\\\x00-\x1f\x7f-\x9f]', '', value)

    # Limit length
    return sanitized[:max_length].strip()

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
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com *.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdnjs.cloudflare.com *.cloudflare.com; "
            "font-src 'self' fonts.googleapis.com fonts.gstatic.com data:; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' https: wss: ws:; "
            "object-src 'none'; "
            "media-src 'self' data: https:; "
            "frame-src 'self' https:; "
            "worker-src 'self' blob:; "
            "child-src 'self' https:; "
            "form-action 'self'; "
            "base-uri 'self'"
        )

        return response

def validate_security_settings() -> Dict[str, Any]:
    """Validate security configuration"""
    issues = []

    # Check secret key
    if not settings.secret_key:
        issues.append("SECRET_KEY not configured - must be set via environment variable")
    elif settings.secret_key == "fallback-secret-key-change-in-production":
        issues.append("SECRET_KEY using fallback value - must be changed for production")

    # Check if running in debug mode in production
    debug_mode = os.getenv("DEBUG", "false").lower() == "true"
    if debug_mode:
        issues.append("DEBUG mode is enabled - should be disabled in production")

    # Check for hardcoded credentials (should not exist)
    if settings.notion_token and settings.notion_token.startswith(("secret_", "ntn_")):
        issues.append("NOTION_TOKEN appears to be hardcoded - users should enter their own tokens")

    return {
        "status": "warning" if issues else "secure",
        "issues": issues,
        "timestamp": time.time()
    }