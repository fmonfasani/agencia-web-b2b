import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import httpx
from pathlib import Path

# backend-agents/ is in sys.path, so absolute import works
from base import LLMProvider
from core.config import settings

logger = logging.getLogger(__name__)


class OpenRouterKey:
    """Representa una API key de OpenRouter con su estado de uso."""
    def __init__(self, key: str, name: Optional[str] = None):
        self.key = key
        self.name = name or f"key_{key[:8]}"
        self.daily_count = 0
        self.last_reset = datetime.utcnow()
        self.is_exhausted = False
        self.backoff_until: Optional[datetime] = None
        self.total_requests = 0  # histórico total


class OpenRouterProvider(LLMProvider):
    """
    Provider de OpenRouter con rotación automática de API keys.

    Configuración (.env):
    - OPENROUTER_API_KEYS: lista separada por comas (min 1 key)
    - OPENROUTER_DEFAULT_MODEL: modelo por defecto (ej: "claude-3.5-sonnet")
    - OPENROUTER_STRATEGY: "least_used" (default) o "round_robin"
    - OPENROUTER_USAGE_FILE: ruta al archivo JSON de persistencia (default: "openrouter_usage.json")
    - OPENROUTER_MAX_DAILY_PER_KEY: límite diario por key (default: 45)
    - OPENROUTER_TIMEZONE: "UTC" o timezone para reset diario

    Uso:
    ```python
    provider = OpenRouterProvider()
    response = await provider.complete(
        system_prompt="Eres un asistente útil",
        messages=[{"role": "user", "content": "Hola"}],
        model="claude-3.5-sonnet"  # opcional, usa default si no se especifica
    )
    ```
    """

    def __init__(self):
        # Cargar API keys desde settings o .env
        keys_str = getattr(settings, 'openrouter_api_keys', '') or os.getenv('OPENROUTER_API_KEYS', '')
        if not keys_str:
            raise ValueError("OPENROUTER_API_KEYS no configurado en .env")

        self.api_keys: List[OpenRouterKey] = [
            OpenRouterKey(key.strip()) for key in keys_str.split(',') if key.strip()
        ]
        if not self.api_keys:
            raise ValueError("No se encontraron API keys válidas")

        # Config
        self.default_model = getattr(settings, 'openrouter_default_model', None) or os.getenv('OPENROUTER_DEFAULT_MODEL', 'openai/gpt-3.5-turbo')
        self.strategy = os.getenv('OPENROUTER_STRATEGY', 'least_used')
        self.max_daily = int(os.getenv('OPENROUTER_MAX_DAILY_PER_KEY', '45'))
        self.usage_file = Path(os.getenv('OPENROUTER_USAGE_FILE', 'openrouter_usage.json'))
        self.timezone = os.getenv('OPENROUTER_TIMEZONE', 'UTC')  # TODO: implementar timezone-aware resets

        # Cargar persistencia (contadores de ayer)
        self._load_usage()

        # Inicializar contadores para hoy si es nuevo día
        self._check_reset_all()

        logger.info(f"OpenRouterProvider iniciado con {len(self.api_keys)} keys. Límite diario: {self.max_daily}")

    @property
    def model(self) -> str:
        """Return the default model configured for OpenRouter."""
        return self.default_model

    def _load_usage(self):
        """Carga contadores desde archivo persistente."""
        if self.usage_file.exists():
            try:
                data = json.loads(self.usage_file.read_text())
                for key in self.api_keys:
                    if key.key in data:
                        saved = data[key.key]
                        key.daily_count = saved.get('daily_count', 0)
                        key.last_reset = datetime.fromisoformat(saved.get('last_reset', datetime.utcnow().isoformat()))
                        key.total_requests = saved.get('total_requests', 0)
            except Exception as e:
                logger.warning(f"Error cargando usage file: {e}. Partiendo desde cero.")

    def _save_usage(self):
        """Guarda contadores a disco."""
        try:
            data = {}
            for key in self.api_keys:
                data[key.key] = {
                    'daily_count': key.daily_count,
                    'last_reset': key.last_reset.isoformat(),
                    'total_requests': key.total_requests,
                    'name': key.name,
                }
            self.usage_file.write_text(json.dumps(data, indent=2))
        except Exception as e:
            logger.error(f"Error guardando usage file: {e}")

    def _check_reset_all(self):
        """Resetea contadores diarios si cambió el día."""
        today = datetime.utcnow().date()
        reset_any = False
        for key in self.api_keys:
            if key.last_reset.date() < today:
                logger.info(f"Reseteando contador de {key.name}: {key.daily_count} requests ayer")
                key.daily_count = 0
                key.last_reset = datetime.utcnow()
                key.is_exhausted = False
                reset_any = True
        if reset_any:
            self._save_usage()

    def _select_key(self) -> Optional[OpenRouterKey]:
        """Selecciona la próxima API key disponible."""
        self._check_reset_all()  # Asegurar reset diario

        # Filtrar keys no exhaustas y sin backoff
        available = [
            k for k in self.api_keys
            if not k.is_exhausted and (k.backoff_until is None or k.backoff_until < datetime.utcnow())
        ]

        if not available:
            logger.warning("Todas las API keys están exhaustas o en backoff")
            return None

        if self.strategy == 'least_used':
            # Ordenar por daily_count ascendente
            available.sort(key=lambda k: k.daily_count)
            return available[0]
        else:  # round_robin
            # Buscar la primera que no esté exhausta (ya están filtradas)
            # Podríamos implementar round-robin verdadero guardando índice last_used
            return available[0]

    def _mark_used(self, key: OpenRouterKey):
        """Incrementa contador de una key."""
        key.daily_count += 1
        key.total_requests += 1

        if key.daily_count >= self.max_daily:
            key.is_exhausted = True
            logger.warning(f"Key {key.name} exhaustada: {key.daily_count}/{self.max_daily} requests hoy")

        # Persistir cada 5 requests o cada minuto (simplificado: cada incremento por ahora)
        self._save_usage()

    def _mark_backoff(self, key: OpenRouterKey, seconds: int = 300):
        """Marca key en backoff temporal (para 429, 500 errors)."""
        key.backoff_until = datetime.utcnow() + timedelta(seconds=seconds)
        logger.info(f"Key {key.name} en backoff por {seconds}s")

    async def complete(self, system_prompt: str, messages: list, model: Optional[str] = None, **kwargs) -> str:
        """
        Hace una llamada a OpenRouter con selección automática de API key.

        Args:
            system_prompt: Prompt del sistema
            messages: Lista de mensajes [{"role": "user", "content": "..."}]
            model: Modelo específico a usar (ej: "claude-3.5-sonnet"). Si None, usa default_model.
            **kwargs: Argumentos adicionales para la API (temperature, max_tokens, etc.)

        Returns:
            str: Contenido de la respuesta del LLM

        Raises:
            RuntimeError: Si todas las keys están exhaustas o fallan
        """
        selected_key = self._select_key()
        if not selected_key:
            raise RuntimeError("Todas las API keys de OpenRouter están exhaustas o en backoff. Intenta más tarde.")

        target_model = model or self.default_model

        headers = {
            "Authorization": f"Bearer {selected_key.key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("OPENROUTER_APP_URL", "https://tusitio.com"),  # opcional
            "X-Title": os.getenv("OPENROUTER_APP_NAME", "Backend-Agents"),  # opcional
        }

        payload = {
            "model": target_model,
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "stream": False,
            **kwargs  # temperature, max_tokens, etc.
        }

        # Incrementar contador ANTES de hacer request (idempotent, se decrementa si falla)
        self._mark_used(selected_key)

        try:
            async with httpx.AsyncClient(timeout=kwargs.get('timeout', 120.0)) as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload
                )

                if response.status_code == 429:  # Rate limit
                    logger.warning(f"Rate limit en key {selected_key.name}. Marking backoff.")
                    self._mark_backoff(selected_key, seconds=600)  # 10 min backoff
                    # Decrementar contador para reintentar con otra key
                    selected_key.daily_count = max(0, selected_key.daily_count - 1)
                    self._save_usage()
                    # Reintentar con otra key
                    selected_key = self._select_key()
                    if not selected_key:
                        raise RuntimeError("Todas las keys en backoff o exhaustas")
                    # Rehacer request con nueva key
                    headers["Authorization"] = f"Bearer {selected_key.key}"
                    response = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json=payload
                    )

                elif response.status_code == 401:  # Invalid key
                    logger.error(f"API key inválida: {selected_key.name}. Deshabilitando temporalmente.")
                    selected_key.is_exhausted = True
                    selected_key.daily_count = self.max_daily  # marcar como exhausta
                    self._save_usage()
                    # Reintentar con otra key
                    selected_key = self._select_key()
                    if not selected_key:
                        raise RuntimeError("Todas las keys inválidas")
                    headers["Authorization"] = f"Bearer {selected_key.key}"
                    response = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json=payload
                    )

                elif response.status_code >= 500:
                    # Error servidor OpenRouter, no penalizar contador
                    logger.warning(f"Error {response.status_code} en OpenRouter. Retrying...")
                    selected_key.daily_count = max(0, selected_key.daily_count - 1)
                    self._save_usage()
                    raise RuntimeError(f"OpenRouter error {response.status_code}: {response.text}")

                response.raise_for_status()
                data = response.json()

                # Extraer contenido
                content = data["choices"][0]["message"]["content"]
                logger.info(
                    f"OpenRouter OK: model={target_model}, key={selected_key.name}",
                    extra={
                        "model": target_model,
                        "key_name": selected_key.name,
                        "daily_count": selected_key.daily_count,
                    }
                )
                return content

        except httpx.RequestError as e:
            logger.error(f"Error de red con OpenRouter: {e}")
            selected_key.daily_count = max(0, selected_key.daily_count - 1)
            self._save_usage()
            raise

        except Exception as e:
            logger.error(f"Error inesperado en OpenRouter: {e}")
            selected_key.daily_count = max(0, selected_key.daily_count - 1)
            self._save_usage()
            raise

    # Método auxiliar: obtener estadísticas
    def get_stats(self) -> Dict[str, Any]:
        """Retorna estadísticas de uso de cada key."""
        self._check_reset_all()
        stats = {
            "total_keys": len(self.api_keys),
            "available_keys": sum(1 for k in self.api_keys if not k.is_exhausted and (k.backoff_until is None or k.backoff_until < datetime.utcnow())),
            "keys": []
        }
        for k in self.api_keys:
            stats["keys"].append({
                "name": k.name,
                "key_preview": f"{k.key[:8]}...",
                "daily_count": k.daily_count,
                "max_daily": self.max_daily,
                "remaining": max(0, self.max_daily - k.daily_count),
                "is_exhausted": k.is_exhausted,
                "backoff_until": k.backoff_until.isoformat() if k.backoff_until else None,
                "total_requests": k.total_requests,
            })
        return stats
