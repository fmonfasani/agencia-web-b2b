"""
app/lib/logging_utils.py - Logging estructurado
"""
import logging
import json
import sys
from contextvars import ContextVar
from datetime import datetime
from typing import Any

trace_id_var: ContextVar[str] = ContextVar('trace_id', default='unknown')


class JSONFormatter(logging.Formatter):
    """Formateador JSON para logs estructurados"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "trace_id": trace_id_var.get(),
        }
        
        # Agregar excepción si existe
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Agregar campos extra
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)
        
        return json.dumps(log_data, ensure_ascii=False)


def setup_structured_logging(level: str = "INFO"):
    """
    Configurar logging estructurado (JSON).
    
    Args:
        level: DEBUG, INFO, WARNING, ERROR
    """
    root = logging.getLogger()
    root.setLevel(level)
    
    # Handler para stderr
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(JSONFormatter())
    root.addHandler(handler)
    
    # Silenciar algunos loggers ruidosos
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    
    return root


def get_logger(name: str) -> logging.Logger:
    """Obtener logger con nombre"""
    return logging.getLogger(name)
