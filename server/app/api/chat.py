from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agent.orchestrator import financial_agent
from app.api.auth import get_optional_current_user
from app.db.models import User
from app.db.session import get_db

router = APIRouter(prefix="/chat", tags=["AI Agent"])


class ChatRequest(BaseModel):
    prompt: str


class ChatResponse(BaseModel):
    prompt: str
    analysis: str


@router.post("/ask", response_model=ChatResponse)
def ask_agent(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt darf nicht leer sein.")
    try:
        return financial_agent.run(request.prompt, user=current_user, db=db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Fehler bei der KI-Analyse: {str(e)}"
        )