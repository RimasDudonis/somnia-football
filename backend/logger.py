import os
import logging
from logging.handlers import TimedRotatingFileHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_DIR, "logs")

os.makedirs(LOG_DIR, exist_ok=True)

backend_log_path = os.path.abspath(os.path.join(LOG_DIR, "backend.log"))
frontend_log_path = os.path.abspath(os.path.join(LOG_DIR, "frontend.log"))

backend_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

backend_logger = logging.getLogger("backend")
backend_logger.setLevel(logging.INFO)
if not backend_logger.handlers:
    backend_handler = TimedRotatingFileHandler(
        filename=backend_log_path,
        when="midnight",
        interval=1,
        backupCount=7,
        encoding="utf-8"
    )
    backend_handler.setFormatter(backend_formatter)
    backend_logger.addHandler(backend_handler)

frontend_logger = logging.getLogger("frontend")
frontend_logger.setLevel(logging.ERROR)
if not frontend_logger.handlers:
    frontend_handler = TimedRotatingFileHandler(
        filename=frontend_log_path,
        when="midnight",
        interval=1,
        backupCount=7,
        encoding="utf-8"
    )
    frontend_handler.setFormatter(backend_formatter)
    frontend_logger.addHandler(frontend_handler)

