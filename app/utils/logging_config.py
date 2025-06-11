import logging
import logging.handlers
import os
from pathlib import Path

def setup_logging():
    """Setup logging configuration with file rotation"""

    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)

    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Setup specific logger for apify_client with DEBUG level
    apify_logger = logging.getLogger('app.clients.apify_client')
    apify_logger.setLevel(logging.DEBUG)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)  # Reduced from INFO to WARNING
    console_handler.setFormatter(formatter)

    # File handler for general app logs
    file_handler = logging.handlers.TimedRotatingFileHandler(
        logs_dir / "app.log",
        when="midnight",
        interval=1,
        backupCount=7,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.ERROR)  # Only log errors to file
    file_handler.setFormatter(formatter)

    # Debug file handler specifically for apify client
    debug_handler = logging.handlers.TimedRotatingFileHandler(
        logs_dir / "apify_debug.log",
        when="midnight",
        interval=1,
        backupCount=3,
        encoding='utf-8'
    )
    debug_handler.setLevel(logging.DEBUG)
    debug_handler.setFormatter(formatter)

    # Error file handler
    error_handler = logging.handlers.TimedRotatingFileHandler(
        logs_dir / "error.log",
        when="midnight",
        interval=1,
        backupCount=30,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)

    # Clear existing handlers to avoid duplicates
    root_logger.handlers.clear()
    apify_logger.handlers.clear()

    # Add handlers to root logger
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)

    # Add debug handler specifically to apify logger
    apify_logger.addHandler(debug_handler)
    apify_logger.addHandler(console_handler)  # Also log to console

    return root_logger