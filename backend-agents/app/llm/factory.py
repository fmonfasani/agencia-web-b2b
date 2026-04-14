"""
Factory para crear instancias de LLMProvider según configuración.
"""

from core.config import settings
# Import from this package
from .ollama_provider import OllamaProvider
from .openrouter_provider import OpenRouterProvider

# Nota: GroqProvider no existe aún en el código base actual - solo OllamaProvider está implementado
#from .groq_provider import GroqProvider


def get_llm_provider(provider: str = None, model: str = None):
    """
    Retorna una instancia del proveedor LLM configurado.

    Args:
        provider: Override de provider ('ollama' | 'openrouter'). Si None usa settings.
        model: Override de modelo. Si None usa el default del provider.

    Returns:
        LLMProvider: Instancia del provider configurado

    Raises:
        ValueError: Si el provider configurado no está soportado
    """
    provider_name = (provider or settings.llm_provider).lower()

    if provider_name == "groq":
        raise NotImplementedError("GroqProvider no está implementado aún")
    elif provider_name == "ollama":
        # OllamaProvider acepta model en el constructor
        effective_model = model or settings.ollama_model
        return OllamaProvider(model=effective_model)
    elif provider_name == "openrouter":
        # OpenRouterProvider.complete() acepta model como parámetro opcional.
        # Sobreescribimos default_model para que todos los llamados usen el modelo elegido.
        instance = OpenRouterProvider()
        if model:
            instance.default_model = model
        return instance
    else:
        raise ValueError(
            f"LLM provider no soportado: {provider_name}. "
            f"Opciones válidas: groq, ollama, openrouter"
        )


def get_available_providers() -> list[str]:
    """
    Retorna la lista de providers disponibles en el sistema.

    Returns:
        list[str]: Lista de nombres de providers disponibles
    """
    available = []
    try:
        # Verificar cada provider
        from .ollama_provider import OllamaProvider
        available.append("ollama")
    except ImportError:
        pass

    try:
        from .openrouter_provider import OpenRouterProvider
        available.append("openrouter")
    except ImportError:
        pass

    #try:
    #    from .groq_provider import GroqProvider
    #    available.append("groq")
    #except ImportError:
    #    pass

    return available
