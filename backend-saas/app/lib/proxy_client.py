"""
proxy_client.py — Cliente HTTP asincrónico para proxy a backend-agents.
"""
import httpx
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

class ProxyClient:
    """Forward requests to backend-agents service."""

    def __init__(self, base_url: str, timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()

    async def connect(self):
        """Create async client."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)

    async def disconnect(self):
        """Close client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def forward(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Forward request to backend-agents.

        Args:
            method: HTTP method (GET, POST, etc.)
            path: API path (e.g., "/agent/execute")
            json: JSON body
            params: Query params
            headers: HTTP headers (X-Trace-Id will be propagated)

        Returns:
            JSON response as dict

        Raises:
            httpx.HTTPError: On network/HTTP errors
        """
        if self._client is None:
            await self.connect()

        url = f"{self.base_url}{path}"

        # Ensure headers dict
        if headers is None:
            headers = {}

        # Log request
        logger.info(
            f"Proxy forward: {method} {path}",
            extra={"tenant_id": json.get("tenant_id") if json else None}
        )

        try:
            response = await self._client.request(
                method=method,
                url=url,
                json=json,
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Proxy error: {method} {path} - {e}")
            raise
