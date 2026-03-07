import psutil
import time
import logging
import httpx
import asyncio
from typing import Dict, Any
from core.config import settings

logger = logging.getLogger(__name__)

class VpsMetricsCollector:
    def __init__(self):
        self.nextjs_url = getattr(settings, "nextjs_internal_url", "http://localhost:3000")
        self.metrics_url = f"{self.nextjs_url}/api/admin/metrics/vps"
        self.internal_api_secret = getattr(settings, "internal_api_secret", None)
        self._last_net_io = psutil.net_io_counters()
        self._last_net_time = time.time()

    def collect(self) -> Dict[str, Any]:
        """Collect current system metrics."""
        # interval=None is non-blocking, returns percentage since last call
        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory().percent
        disk = psutil.disk_usage('/').percent
        
        # Calculate network speed (bytes/s)
        current_net_io = psutil.net_io_counters()
        current_time = time.time()
        time_delta = current_time - self._last_net_time
        
        net_in = (current_net_io.bytes_recv - self._last_net_io.bytes_recv) / time_delta if time_delta > 0 else 0
        net_out = (current_net_io.bytes_sent - self._last_net_io.bytes_sent) / time_delta if time_delta > 0 else 0
        
        self._last_net_io = current_net_io
        self._last_net_time = current_time
        
        return {
            "cpuUsage": cpu,
            "memUsage": mem,
            "diskUsage": disk,
            "netIn": net_in,
            "netOut": net_out
        }

    async def push_metrics(self):
        """Collect and push metrics to Next.js API."""
        try:
            metrics = self.collect()
            headers = {"Content-Type": "application/json"}
            if self.internal_api_secret:
                headers["X-Internal-Secret"] = self.internal_api_secret

            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(self.metrics_url, json=metrics, headers=headers)
                if resp.status_code == 200:
                    logger.info(f"[Metrics] VPS metrics pushed successfully: CPU {metrics['cpuUsage']}%")
                else:
                    logger.warning(f"[Metrics] Failed to push metrics: {resp.status_code}")
        except Exception as e:
            logger.error(f"[Metrics] Error pushing metrics: {e}")

vps_metrics_collector = VpsMetricsCollector()
