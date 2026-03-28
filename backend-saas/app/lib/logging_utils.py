import json
import logging
import re
import uuid
from contextvars import ContextVar
from typing import Any

# Context variable for trace_id
trace_id_var: ContextVar[str] = ContextVar("trace_id", default="no-trace")

# Sensitive data patterns for scrubbing
SENSITIVE_PATTERNS = [
    (re.compile(r'(?i)("?password"?\s*[:=]\s*)"[^"]*"'), r'\1"***"'),
    (re.compile(r'(?i)("?token"?\s*[:=]\s*)"[^"]*"'), r'\1"***"'),
    (re.compile(r'(?i)("?access_token"?\s*[:=]\s*)"[^"]*"'), r'\1"***"'),
    (re.compile(r'(?i)("?secret"?\s*[:=]\s*)"[^"]*"'), r'\1"***"'),
    (re.compile(r'[\w\.-]+@[\w\.-]+\.\w+'), "[EMAIL_REDACTED]"),
]

def scrub_sensitive_data(message: str) -> str:
    """Redacts PII and secrets from log messages."""
    for pattern, replacement in SENSITIVE_PATTERNS:
        message = pattern.sub(replacement, message)
    return message

class JSONFormatter(logging.Formatter):
    """Custom format for JSON logs with trace_id and scrubbing."""
    def format(self, record: logging.LogRecord) -> str:
        trace_id = trace_id_var.get()
        
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": scrub_sensitive_data(record.getMessage()),
            "trace_id": trace_id,
            "logger": record.name,
            "module": record.module,
        }
        
        # Add extra fields if they exist (e.g. from logging.info(..., extra={"tenant_id": "..."}))
        if hasattr(record, "tenant_id"):
            log_data["tenant_id"] = record.tenant_id
            
        return json.dumps(log_data)

def setup_structured_logging():
    """Configures the root logger with the JSON formatter."""
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = [handler]
    
    # Silence third-party loggers if needed
    logging.getLogger("uvicorn.access").handlers = [handler]
    logging.getLogger("uvicorn.error").handlers = [handler]
