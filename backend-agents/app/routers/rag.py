from fastapi import APIRouter, Query
from app.tools.rag import search_rag

router = APIRouter()

@router.get("/search")
async def rag_search(
    q: str = Query(...),
    tenant_id: str = Query(...)
):
    return await search_rag(tenant_id, q)
