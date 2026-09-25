import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import sage
from app.services.gemini import GeminiRateLimit

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatContext(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    source: str | None = Field(default=None, max_length=200)
    summary: str | None = Field(default=None, max_length=4000)
    concepts: str | None = Field(default=None, max_length=2000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)
    context: ChatContext | None = None


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_sage(req: ChatRequest) -> ChatResponse:
    if req.messages[-1].role != "user":
        raise HTTPException(status_code=400, detail="Last message must be from the user.")
    try:
        reply = await sage.chat(
            [m.model_dump() for m in req.messages],
            context=req.context.model_dump() if req.context else None,
        )
    except GeminiRateLimit as exc:
        raise HTTPException(
            status_code=429,
            detail="Sage is busy — try again in a moment.",
            headers={"Retry-After": str(exc.retry_after)},
        ) from exc
    return ChatResponse(reply=reply or "I'm here — could you ask that again?")
