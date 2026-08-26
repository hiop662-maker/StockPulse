from fastapi import APIRouter
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