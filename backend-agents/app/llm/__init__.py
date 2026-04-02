# Import using absolute paths because backend-agents/ is in sys.path
from ollama_provider import OllamaProvider
from .openrouter_provider import OpenRouterProvider

__all__ = ['OllamaProvider', 'OpenRouterProvider']
