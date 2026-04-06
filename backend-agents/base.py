"""
Abstract base class for LLM providers.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    def __init__(self, model: str = None):
        """
        Initialize the LLM provider.
        
        Args:
            model: Model name to use. If None, provider will use its default.
        """
        self.model = model
    
    @abstractmethod
    async def complete(self, system_prompt: str, messages: List[Dict[str, str]]) -> str:
        """
        Generate a completion using the LLM.
        
        Args:
            system_prompt: System prompt for the LLM
            messages: List of message dicts with 'role' and 'content'
            
        Returns:
            Completion text from the LLM
        """
        pass
