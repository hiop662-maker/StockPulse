from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.schemas.ai import BullBearRequest, BullBearAnalysis
from app.services.ai_advisor import ai_service
from app.services.bull_bear_service import generate_bull_bear_analysis

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

@router.post("/bull-bear", response_model=BullBearAnalysis)
async def get_bull_bear_case(payload: BullBearRequest):
    try:
        return await generate_bull_bear_analysis(payload.symbol, force_refresh=payload.force_refresh)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Fehler bei der KI-Analyse: {str(e)}",
        )