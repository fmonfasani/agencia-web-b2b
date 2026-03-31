import os
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.semconv.resource import ResourceAttributes

logger = logging.getLogger(__name__)

def setup_observability(app):
    """
    Sets up OpenTelemetry tracing for the FastAPI application.
    """
    # Check if observability is explicitly enabled
    if os.getenv("OTEL_ENABLED", "false").lower() != "true":
        logger.info("--- [Observability] OpenTelemetry is disabled (default) ---")
        return

    # 1. Setup Tracer Provider
    resource = Resource(attributes={
        ResourceAttributes.SERVICE_NAME: "agencia-web-b2b-agent-service",
        "deployment.environment": os.getenv("ENV", "production")
    })
    
    provider = TracerProvider(resource=resource)

    # 2. Setup OTLP Exporter (HTTP)
    # Default to local collector or a specific endpoint
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4318/v1/traces")
    
    try:
        exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        processor = BatchSpanProcessor(exporter)
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)
        
        # 3. Instrument Requests library (outgoing calls)
        RequestsInstrumentor().instrument()
        
        # 4. Instrument FastAPI (incoming calls)
        FastAPIInstrumentor.instrument_app(app)
        
        logger.info(f"--- [Observability] OpenTelemetry initialized (Endpoint: {otlp_endpoint}) ---")
    except Exception as e:
        logger.error(f"--- [Observability] Failed to initialize OpenTelemetry: {e} ---")

def get_tracer(name: str):
    return trace.get_tracer(name)
