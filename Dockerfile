# Use Python 3.11 slim image for optimal size and performance
FROM python:3.11-slim

# Set working directory in the container
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY pyproject.toml ./

# Install dependencies directly with pip
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    apify-client \
    fastapi \
    google-api-python-client \
    google-auth \
    notion-client \
    pydantic \
    pydantic-settings \
    python-multipart \
    structlog \
    tenacity \
    uvicorn

# Copy application code
COPY app/ ./app/

# Create directory for logs and data
RUN mkdir -p /app/logs /app/data

# Expose the port the app runs on
EXPOSE 5000

# Set proper permissions
RUN chmod +x app/

# Health check to ensure the container is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Set the Python path to include the app directory
ENV PYTHONPATH=/app/app

# Change to app directory for proper imports
WORKDIR /app/app

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]