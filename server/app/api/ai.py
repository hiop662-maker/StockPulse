from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from app.services.ai_advisor import ai_service

router = APIRouter(prefix="/ai", tags=["AI Advisor"])

class ChatMessageModel(BaseModel):
    role: str
    content: str

class AdvisorRequest(BaseModel):
    symbol: str
    question: str
    history: Optional[List[ChatMessageModel]] = []

@router.post("/advisor")
async def chat_advisor(req: AdvisorRequest):
    history_dicts = [m.model_dump() for m in req.history] if req.history else []
    reply = ai_service.analyze_stock(req.symbol, req.question, history_dicts)
    return {"reply": reply, "symbol": req.symbol}

@router.post("/advisor/stream")
async def chat_advisor_stream(req: AdvisorRequest):
    history_dicts = [m.model_dump() for m in req.history] if req.history else []
    return StreamingResponse(
        ai_service.stream_stock_analysis(req.symbol, req.question, history_dicts),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )