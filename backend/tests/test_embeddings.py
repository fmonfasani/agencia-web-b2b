import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.embedding_utils import text_to_embedding

def test_embedding_generation():
    """Test that embedding generation works"""
    text = "test document for embedding"
    embedding = text_to_embedding(text)
    assert isinstance(embedding, list)
    assert len(embedding) == 128
    assert all(isinstance(x, float) for x in embedding)

def test_embedding_determinism():
    """Test that same text produces same embedding"""
    text = "deterministic test"
    emb1 = text_to_embedding(text)
    emb2 = text_to_embedding(text)
    assert emb1 == emb2

def test_embedding_different_texts():
    """Test that different texts produce different embeddings"""
    emb1 = text_to_embedding("hello world")
    emb2 = text_to_embedding("goodbye world")
    assert emb1 != emb2

def test_embedding_empty_text():
    """Test empty text handling"""
    emb = text_to_embedding("")
    assert len(emb) == 128
    assert all(x == 0.0 for x in emb)