"""
Comprehensive health check module for backend-saas.
Monitors all critical dependencies: PostgreSQL, Qdrant, and Ollama.
"""
import logging
import os
from datetime import datetime
from typing import Any, Dict, List

import httpx
import psycopg2
from qdrant_client import QdrantClient

logger = logging.getLogger(__name__)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.warning("DATABASE_URL not set, health check may fail")
    DATABASE_URL = "postgresql://postgres:password@127.0.0.1:5432/agencia_web_b2b"  # fallback for dev
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
HEALTH_CHECK_TIMEOUT = 5.0


async def check_database() -> Dict[str, Any]:
    """
    Checks PostgreSQL connection and basic connectivity.

    Returns:
        Dict with status, service name, and optional error message.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cur.close()
        conn.close()

        logger.info("Database health check: healthy")
        return {
            "status": "healthy",
            "service": "postgresql",
        }
    except psycopg2.Error as e:
        error_msg = f"PostgreSQL connection failed: {str(e)}"
        logger.warning(error_msg)
        return {
            "status": "unhealthy",
            "service": "postgresql",
            "error": error_msg,
        }
    except Exception as e:
        error_msg = f"Unexpected database error: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "unhealthy",
            "service": "postgresql",
            "error": error_msg,
        }


async def check_qdrant() -> Dict[str, Any]:
    """
    Checks Qdrant vector database connectivity.
    Attempts to list collections as a health check.

    Returns:
        Dict with status, service name, and optional error message.
    """
    try:
        client = QdrantClient(url=QDRANT_URL, timeout=HEALTH_CHECK_TIMEOUT)
        # Simple health check: try to get collections
        client.get_collections()

        logger.info("Qdrant health check: healthy")
        return {
            "status": "healthy",
            "service": "qdrant",
        }
    except Exception as e:
        error_msg = f"Qdrant connection failed: {str(e)}"
        logger.warning(error_msg)
        return {
            "status": "unhealthy",
            "service": "qdrant",
            "error": error_msg,
        }


async def check_ollama() -> Dict[str, Any]:
    """
    Checks Ollama LLM service connectivity.
    Attempts to fetch available models as a health check.

    Returns:
        Dict with status, service name, and optional error message.
    """
    try:
        async with httpx.AsyncClient(timeout=HEALTH_CHECK_TIMEOUT) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            response.raise_for_status()

        logger.info("Ollama health check: healthy")
        return {
            "status": "healthy",
            "service": "ollama",
        }
    except httpx.TimeoutException as e:
        error_msg = f"Ollama request timed out: {str(e)}"
        logger.warning(error_msg)
        return {
            "status": "unhealthy",
            "service": "ollama",
            "error": error_msg,
        }
    except httpx.HTTPError as e:
        error_msg = f"Ollama HTTP error: {str(e)}"
        logger.warning(error_msg)
        return {
            "status": "unhealthy",
            "service": "ollama",
            "error": error_msg,
        }
    except Exception as e:
        error_msg = f"Ollama connection failed: {str(e)}"
        logger.warning(error_msg)
        return {
            "status": "unhealthy",
            "service": "ollama",
            "error": error_msg,
        }


async def get_full_health_status() -> Dict[str, Any]:
    """
    Returns comprehensive health status for all dependencies.

    Checks:
    - PostgreSQL database
    - Qdrant vector store
    - Ollama LLM service

    Returns:
        Dict with:
        - status: "healthy", "degraded", or "unhealthy"
        - timestamp: ISO 8601 timestamp
        - dependencies: List of dicts with service health info
    """
    # Run all health checks concurrently
    import asyncio

    db_check, qdrant_check, ollama_check = await asyncio.gather(
        check_database(),
        check_qdrant(),
        check_ollama(),
        return_exceptions=False,
    )

    dependencies: List[Dict[str, Any]] = [db_check, qdrant_check, ollama_check]

    # Determine overall status
    healthy_count = sum(1 for dep in dependencies if dep["status"] == "healthy")
    total_count = len(dependencies)

    if healthy_count == total_count:
        overall_status = "healthy"
    elif healthy_count > 0:
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"

    # Log the result
    logger.info(
        f"Full health check: {overall_status} ({healthy_count}/{total_count} services healthy)",
        extra={
            "overall_status": overall_status,
            "healthy_services": healthy_count,
            "total_services": total_count,
        },
    )

    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "dependencies": dependencies,
    }
