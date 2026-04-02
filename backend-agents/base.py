from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @property
    @abstractmethod
    def model(self) -> str:
        """Return the model name being used by this provider."""
        pass

    @abstractmethod
    async def complete(self, system_prompt: str, messages: list) -> str:
        pass
