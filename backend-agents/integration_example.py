"""
EJEMPLO: Integración del sistema de trazabilidad en tu código actual

Archivo: backend/app/main.py (MODIFICADO)
"""

import time
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse

from agent_request_model import AgentRequest, AgentResponse, ErrorResponse, TraceStepType
from tracing_context import TracingContext, create_tracing_context
from your_engine import LangGraphEngine  # Tu engine actual

app = FastAPI()


@app.post("/agent/execute", response_model=AgentResponse)
async def execute_agent(
    req: AgentRequest,
    request: Request,
    session_tenant_id: str = Depends(get_current_tenant)  # Tu dependency actual
):
    """
    Ejecutar agente con trazabilidad completa
    """
    
    # ========================================================================
    # 1. CREAR CONTEXTO DE TRAZABILIDAD
    # ========================================================================
    
    ctx = create_tracing_context(
        tenant_id=req.tenant_id,
        query=req.query,
        enable_detailed_trace=req.enable_detailed_trace,
        trace_id=req.trace_id  # Puede venir del request o se genera auto
    )
    
    print(f"[TRACE START] {ctx.trace_id} | tenant={req.tenant_id}")
    
    try:
        # ====================================================================
        # 2. VALIDACIÓN (con tracing)
        # ====================================================================
        
        with ctx.trace_step("validation", TraceStepType.VALIDATION):
            # Cross-validation multitenancy
            if os.getenv("ALLOW_FALLBACK_TENANT") == "true":
                effective_tenant_id = req.tenant_id
            else:
                if req.tenant_id != session_tenant_id:
                    raise HTTPException(
                        status_code=403, 
                        detail="Tenant ID mismatch"
                    )
                effective_tenant_id = session_tenant_id
            
            # Sanitization
            query_clean = req.query.strip()
            
            # Prompt injection guard
            malicious_patterns = [
                "ignore previous instructions", 
                "system override", 
                "bypass safety"
            ]
            if any(p in query_clean.lower() for p in malicious_patterns):
                raise HTTPException(
                    status_code=400, 
                    detail="Identified potentially malicious input pattern."
                )
        
        # ====================================================================
        # 3. EJECUTAR AGENTE (con tracing context pasado al engine)
        # ====================================================================
        
        engine = LangGraphEngine(
            tenant_id=effective_tenant_id,
            tracing_context=ctx  # ← IMPORTANTE: pasar el contexto
        )
        
        # El engine internamente va a ir llenando ctx con cada paso
        result, metadata = await asyncio.wait_for(
            engine.run(query_clean), 
            timeout=60.0
        )
        
        # ====================================================================
        # 4. CONSTRUIR RESPONSE CON TRAZABILIDAD
        # ====================================================================
        
        # Finalizar trace
        ctx.add_step(
            step_id="response_complete",
            step_type=TraceStepType.RESPONSE_COMPLETE,
            output_data={
                "result_messages": len(result),
                "iterations": metadata.get("iterations")
            }
        )
        
        # Print summary si está en modo debug
        if req.enable_detailed_trace:
            ctx.print_summary()
        
        # Construir response
        response = AgentResponse(
            trace_id=ctx.trace_id,
            tenant_id=effective_tenant_id,
            query=req.query,
            result=result,
            metadata=metadata,
            total_duration_ms=ctx.get_total_duration_ms(),
            timestamp_start=ctx.timestamp_start,
            timestamp_end=datetime.utcnow(),
            
            # Trazas específicas (SIEMPRE presentes)
            embedding_trace=ctx.embedding_traces if ctx.embedding_traces else None,
            qdrant_trace=ctx.qdrant_traces if ctx.qdrant_traces else None,
            rag_context_trace=ctx.rag_context_trace,
            llm_traces=ctx.llm_traces if ctx.llm_traces else None,
            
            # Trace detallado (solo si enable_detailed_trace=True)
            trace=ctx.steps if req.enable_detailed_trace else None,
            
            # Header para response
            x_process_time=f"{ctx.get_total_duration_ms()}ms"
        )
        
        print(f"[TRACE END] {ctx.trace_id} | duration={ctx.get_total_duration_ms()}ms")
        
        return response
    
    except HTTPException as http_err:
        # Re-raise HTTPException (401, 403, 400, etc.)
        raise
    
    except asyncio.TimeoutError:
        # Timeout
        error_resp = ErrorResponse(
            trace_id=ctx.trace_id,
            error_type="TimeoutError",
            error_message="Agent execution timed out after 60s",
            timestamp=datetime.utcnow(),
            failed_at_step="agent_execution",
            partial_trace=ctx.steps if req.enable_detailed_trace else None
        )
        
        print(f"[TRACE ERROR] {ctx.trace_id} | Timeout")
        
        raise HTTPException(
            status_code=504,
            detail=error_resp.dict()
        )
    
    except Exception as e:
        # Error interno
        error_resp = ErrorResponse(
            trace_id=ctx.trace_id,
            error_type=type(e).__name__,
            error_message=str(e),
            timestamp=datetime.utcnow(),
            failed_at_step="unknown",
            partial_trace=ctx.steps if req.enable_detailed_trace else None,
            debug_info={
                "tenant_id": effective_tenant_id,
                "query_preview": req.query[:100]
            }
        )
        
        print(f"[TRACE ERROR] {ctx.trace_id} | {type(e).__name__}: {e}")
        
        raise HTTPException(
            status_code=500,
            detail=error_resp.dict()
        )


# ============================================================================
# EJEMPLO: Modificar tu LangGraphEngine para usar TracingContext
# ============================================================================

"""
Archivo: backend/app/langgraph_engine.py (MODIFICADO)
"""

from tracing_context import TracingContext
from agent_request_model import TraceStepType

class LangGraphEngine:
    def __init__(
        self, 
        tenant_id: str,
        tracing_context: Optional[TracingContext] = None
    ):
        self.tenant_id = tenant_id
        self.ctx = tracing_context  # Guardar referencia al contexto
        
        # ... resto de tu init actual
    
    async def run(self, task: str):
        """
        Ejecutar agente con trazabilidad integrada
        """
        
        messages = []
        iterations = 0
        max_iterations = 5
        
        # ====================================================================
        # PASO 1: EMBEDDING DE LA QUERY
        # ====================================================================
        
        start_time = time.time()
        
        # Tu código actual de embedding
        query_vector = self.embedding_model.encode(task).tolist()
        
        embedding_duration_ms = int((time.time() - start_time) * 1000)
        
        # TRACING: registrar el embedding
        if self.ctx:
            self.ctx.add_embedding_trace(
                model_name="BAAI/bge-small-en-v1.5",  # Tu modelo
                input_text=task,
                vector=query_vector,
                duration_ms=embedding_duration_ms
            )
        
        # ====================================================================
        # PASO 2: BÚSQUEDA EN QDRANT
        # ====================================================================
        
        start_time = time.time()
        
        # Tu código actual de Qdrant search
        search_results = self.qdrant_client.search(
            collection_name="agent_memory",
            query_vector=query_vector,
            limit=5,
            query_filter={
                "must": [
                    {"key": "tenant_id", "match": {"value": self.tenant_id}}
                ]
            }
        )
        
        qdrant_duration_ms = int((time.time() - start_time) * 1000)
        
        # TRACING: registrar la búsqueda
        if self.ctx:
            results_formatted = [
                {
                    "id": result.id,
                    "score": result.score,
                    "payload": result.payload
                }
                for result in search_results
            ]
            
            self.ctx.add_qdrant_trace(
                collection_name="agent_memory",
                query_vector=query_vector,
                top_k=5,
                filter_dict={"tenant_id": self.tenant_id},
                results=results_formatted,
                duration_ms=qdrant_duration_ms
            )
        
        # ====================================================================
        # PASO 3: CONSTRUIR CONTEXTO RAG
        # ====================================================================
        
        chunks = []
        chunk_ids = []
        
        for result in search_results:
            chunk_text = result.payload.get("text", "")
            chunks.append(chunk_text)
            chunk_ids.append(str(result.id))
        
        rag_context = "\n\n".join(chunks)
        
        # TRACING: registrar contexto RAG
        if self.ctx:
            self.ctx.set_rag_context_trace(
                chunks=chunks,
                chunk_ids=chunk_ids,
                context_text=rag_context
            )
        
        # ====================================================================
        # PASO 4: LOOP DEL AGENTE (con llamadas al LLM)
        # ====================================================================
        
        while iterations < max_iterations:
            iterations += 1
            
            # TRACING: marcar inicio de iteración
            if self.ctx:
                self.ctx.add_step(
                    step_id=f"agent_iteration_{iterations}",
                    step_type=TraceStepType.AGENT_ITERATION,
                    input_data={
                        "iteration": iterations,
                        "max_iterations": max_iterations
                    }
                )
            
            # Construir prompt
            prompt = self._build_prompt(task, rag_context, messages)
            
            # ================================================================
            # LLAMADA AL LLM (con tracing)
            # ================================================================
            
            start_time = time.time()
            
            # Tu código actual de llamada a Ollama
            llm_response = self.llm_client.chat.completions.create(
                model="qwen2.5:0.5b",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=500
            )
            
            response_text = llm_response.choices[0].message.content
            
            llm_duration_ms = int((time.time() - start_time) * 1000)
            
            # TRACING: registrar llamada al LLM
            if self.ctx:
                self.ctx.add_llm_trace(
                    model_name="qwen2.5:0.5b",
                    provider="ollama",
                    prompt=prompt,
                    response=response_text,
                    temperature=0.7,
                    duration_ms=llm_duration_ms,
                    tokens_input=llm_response.usage.prompt_tokens if hasattr(llm_response, 'usage') else None,
                    tokens_output=llm_response.usage.completion_tokens if hasattr(llm_response, 'usage') else None,
                    max_tokens=500,
                    finish_reason=llm_response.choices[0].finish_reason
                )
            
            # Agregar a messages
            messages.append({
                "role": "assistant",
                "content": response_text
            })
            
            # Check si el agente decidió terminar
            if "FINAL_ANSWER" in response_text or iterations >= max_iterations:
                break
        
        # ====================================================================
        # RETORNAR RESULTADO + METADATA
        # ====================================================================
        
        metadata = {
            "tenant_id": self.tenant_id,
            "iterations": iterations,
            "rag_queries": [
                {
                    "query_text": task,
                    "tenant_id": self.tenant_id,
                    "results_count": len(search_results)
                }
            ],
            "rag_results": chunks
        }
        
        return messages, metadata
