"""
Sistema de Trazabilidad para Agent Execution
Captura cada paso del flujo: API → Embedding → Qdrant → RAG → LLM
"""

import time
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
from dataclasses import dataclass, field

from .agent_request_model import (
    TraceStep, TraceStepType, 
    EmbeddingTrace, QdrantSearchTrace, 
    RAGContextTrace, LLMCallTrace
)


@dataclass
class TracingContext:
    """
    Contexto de trazabilidad que pasa por todo el flujo.
    Se va completando en cada paso.
    """
    
    # Identificadores
    trace_id: str = field(default_factory=lambda: f"trace_{uuid.uuid4().hex[:12]}")
    tenant_id: str = ""
    query: str = ""
    
    # Control
    enable_detailed_trace: bool = False
    timestamp_start: datetime = field(default_factory=datetime.utcnow)
    
    # Traces acumulados
    steps: List[TraceStep] = field(default_factory=list)
    embedding_traces: List[EmbeddingTrace] = field(default_factory=list)
    qdrant_traces: List[QdrantSearchTrace] = field(default_factory=list)
    rag_context_trace: Optional[RAGContextTrace] = None
    llm_traces: List[LLMCallTrace] = field(default_factory=list)
    
    # Timing
    _step_start_times: Dict[str, float] = field(default_factory=dict)
    
    def __post_init__(self):
        """Log inicio del trace"""
        self.add_step(
            step_id="trace_start",
            step_type=TraceStepType.REQUEST_RECEIVED,
            input_data={
                "tenant_id": self.tenant_id,
                "query": self.query,
                "trace_id": self.trace_id
            }
        )
    
    def add_step(
        self,
        step_id: str,
        step_type: TraceStepType,
        input_data: Optional[Dict[str, Any]] = None,
        output_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        duration_ms: Optional[int] = None
    ):
        """Agregar un paso a la trazabilidad"""
        
        step = TraceStep(
            step_id=step_id,
            step_type=step_type,
            timestamp=datetime.utcnow(),
            duration_ms=duration_ms,
            input_data=input_data,
            output_data=output_data,
            metadata=metadata,
            error=error
        )
        
        self.steps.append(step)
        
        # Log para debugging
        if self.enable_detailed_trace:
            print(f"[TRACE] {step_id} | {step_type} | {duration_ms}ms")
    
    @contextmanager
    def trace_step(
        self,
        step_id: str,
        step_type: TraceStepType,
        input_data: Optional[Dict[str, Any]] = None
    ):
        """
        Context manager para trazar un paso con timing automático
        
        Usage:
            with ctx.trace_step("embedding_1", TraceStepType.EMBEDDING_START):
                vector = generate_embedding(text)
        """
        start_time = time.time()
        
        try:
            yield
            
            # Success
            duration_ms = int((time.time() - start_time) * 1000)
            self.add_step(
                step_id=step_id,
                step_type=step_type,
                input_data=input_data,
                duration_ms=duration_ms
            )
            
        except Exception as e:
            # Error
            duration_ms = int((time.time() - start_time) * 1000)
            self.add_step(
                step_id=f"{step_id}_error",
                step_type=TraceStepType.ERROR,
                input_data=input_data,
                error=str(e),
                duration_ms=duration_ms
            )
            raise
    
    def add_embedding_trace(
        self,
        model_name: str,
        input_text: str,
        vector: List[float],
        duration_ms: int
    ):
        """Agregar trace de embedding"""
        
        trace = EmbeddingTrace(
            model_name=model_name,
            input_text=input_text[:200],  # Truncar para no explotar logs
            input_length_chars=len(input_text),
            vector_dimension=len(vector),
            duration_ms=duration_ms,
            vector_preview=vector[:5]  # Solo primeros 5 valores
        )
        
        self.embedding_traces.append(trace)
        
        # También agregar como step
        self.add_step(
            step_id=f"embedding_{len(self.embedding_traces)}",
            step_type=TraceStepType.EMBEDDING_COMPLETE,
            input_data={"text_preview": input_text[:100]},
            output_data={"vector_dim": len(vector)},
            metadata={"model": model_name},
            duration_ms=duration_ms
        )
    
    def add_qdrant_trace(
        self,
        collection_name: str,
        query_vector: List[float],
        top_k: int,
        filter_dict: Optional[Dict[str, Any]],
        results: List[Dict[str, Any]],
        duration_ms: int
    ):
        """Agregar trace de búsqueda en Qdrant"""
        
        # Extraer scores
        scores = [r.get("score", 0.0) for r in results]
        top_scores = sorted(scores, reverse=True)[:3]
        
        # Chunks con metadata
        chunks_found = [
            {
                "chunk_id": r.get("id"),
                "score": r.get("score"),
                "text_preview": r.get("payload", {}).get("text", "")[:200],
                "metadata": r.get("payload", {}).get("metadata", {})
            }
            for r in results
        ]
        
        trace = QdrantSearchTrace(
            collection_name=collection_name,
            query_vector_preview=query_vector[:5],
            top_k=top_k,
            filter_applied=filter_dict,
            results_count=len(results),
            top_scores=top_scores,
            duration_ms=duration_ms,
            chunks_found=chunks_found
        )
        
        self.qdrant_traces.append(trace)
        
        # También agregar como step
        self.add_step(
            step_id=f"qdrant_search_{len(self.qdrant_traces)}",
            step_type=TraceStepType.QDRANT_SEARCH,
            input_data={
                "collection": collection_name,
                "top_k": top_k,
                "filter": filter_dict
            },
            output_data={
                "results_count": len(results),
                "top_scores": top_scores
            },
            duration_ms=duration_ms
        )
    
    def set_rag_context_trace(
        self,
        chunks: List[str],
        chunk_ids: List[str],
        context_text: str
    ):
        """Agregar trace del contexto RAG construido"""
        
        self.rag_context_trace = RAGContextTrace(
            total_chunks=len(chunks),
            total_chars=len(context_text),
            context_preview=context_text[:500],
            chunk_sources=chunk_ids
        )
        
        # También agregar como step
        self.add_step(
            step_id="rag_context_build",
            step_type=TraceStepType.RAG_CONTEXT_BUILD,
            input_data={"chunks_count": len(chunks)},
            output_data={
                "context_length": len(context_text),
                "chunk_ids": chunk_ids
            }
        )
    
    def add_llm_trace(
        self,
        model_name: str,
        provider: str,
        prompt: str,
        response: str,
        temperature: float,
        duration_ms: int,
        tokens_input: Optional[int] = None,
        tokens_output: Optional[int] = None,
        max_tokens: Optional[int] = None,
        finish_reason: Optional[str] = None
    ):
        """Agregar trace de llamada al LLM"""
        
        trace = LLMCallTrace(
            model_name=model_name,
            provider=provider,
            prompt_length_chars=len(prompt),
            prompt_preview=prompt[:300],
            temperature=temperature,
            max_tokens=max_tokens,
            response_length_chars=len(response),
            response_preview=response[:300],
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            duration_ms=duration_ms,
            finish_reason=finish_reason,
            model_version=model_name  # Puede mejorarse con versión exacta
        )
        
        self.llm_traces.append(trace)
        
        # También agregar como step
        self.add_step(
            step_id=f"llm_call_{len(self.llm_traces)}",
            step_type=TraceStepType.LLM_CALL_COMPLETE,
            input_data={
                "model": model_name,
                "prompt_preview": prompt[:200],
                "temperature": temperature
            },
            output_data={
                "response_preview": response[:200],
                "tokens_input": tokens_input,
                "tokens_output": tokens_output
            },
            metadata={
                "provider": provider,
                "finish_reason": finish_reason
            },
            duration_ms=duration_ms
        )
    
    def get_total_duration_ms(self) -> int:
        """Calcular duración total desde inicio"""
        delta = datetime.utcnow() - self.timestamp_start
        return int(delta.total_seconds() * 1000)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a dict para logging/JSON"""
        return {
            "trace_id": self.trace_id,
            "tenant_id": self.tenant_id,
            "query": self.query,
            "total_duration_ms": self.get_total_duration_ms(),
            "steps_count": len(self.steps),
            "embeddings_count": len(self.embedding_traces),
            "qdrant_searches": len(self.qdrant_traces),
            "llm_calls": len(self.llm_traces),
            "timestamp_start": self.timestamp_start.isoformat(),
            "detailed_trace_enabled": self.enable_detailed_trace
        }
    
    def print_summary(self):
        """Imprimir resumen de trazabilidad (para debugging)"""
        print("\n" + "="*80)
        print(f"TRACE SUMMARY: {self.trace_id}")
        print("="*80)
        print(f"Tenant: {self.tenant_id}")
        print(f"Query: {self.query}")
        print(f"Total Duration: {self.get_total_duration_ms()}ms")
        print(f"\nSteps executed: {len(self.steps)}")
        
        if self.embedding_traces:
            print(f"\nEmbeddings generated: {len(self.embedding_traces)}")
            for i, emb in enumerate(self.embedding_traces, 1):
                print(f"  {i}. {emb.model_name} | {emb.duration_ms}ms | dim={emb.vector_dimension}")
        
        if self.qdrant_traces:
            print(f"\nQdrant searches: {len(self.qdrant_traces)}")
            for i, qd in enumerate(self.qdrant_traces, 1):
                print(f"  {i}. {qd.results_count} results | {qd.duration_ms}ms | scores={qd.top_scores}")
        
        if self.rag_context_trace:
            print(f"\nRAG Context:")
            print(f"  Chunks: {self.rag_context_trace.total_chunks}")
            print(f"  Total chars: {self.rag_context_trace.total_chars}")
        
        if self.llm_traces:
            print(f"\nLLM calls: {len(self.llm_traces)}")
            for i, llm in enumerate(self.llm_traces, 1):
                tokens_info = ""
                if llm.tokens_input and llm.tokens_output:
                    tokens_info = f" | tokens: {llm.tokens_input}→{llm.tokens_output}"
                print(f"  {i}. {llm.model_name} | {llm.duration_ms}ms{tokens_info}")
        
        print("="*80 + "\n")


# ============================================================================
# HELPER: Crear TracingContext desde Request
# ============================================================================

def create_tracing_context(
    tenant_id: str,
    query: str,
    enable_detailed_trace: bool = False,
    trace_id: Optional[str] = None
) -> TracingContext:
    """Factory para crear TracingContext"""
    
    ctx = TracingContext(
        tenant_id=tenant_id,
        query=query,
        enable_detailed_trace=enable_detailed_trace
    )
    
    # Override trace_id si viene del request
    if trace_id:
        ctx.trace_id = trace_id
    
    return ctx
