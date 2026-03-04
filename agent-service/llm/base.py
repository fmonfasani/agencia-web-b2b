from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, system_prompt: str, messages: list) -> str:
        pass
