from app.agent.orchestrator import financial_agent
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["AI Agent"])


class ChatRequest(BaseModel):
  prompt: str


class ChatResponse(BaseModel):
  prompt: str
  analysis: str


@router.post("/ask", response_model=ChatResponse)
def ask_agent(request: ChatRequest):
  try:
    if not request.prompt.strip():
      raise HTTPException(
          status_code=400, detail="Prompt darf nicht leer sein."
      )

    result = financial_agent.run(request.prompt)
    return result
  except Exception as e:
    raise HTTPException(
        status_code=500, detail=f"Fehler bei der KI-Analyse: {str(e)}"
    )