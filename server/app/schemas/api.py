from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.quiz import Quiz
from app.schemas.study_guide import StudyGuide


class ProcessResponse(BaseModel):
    document_id: UUID
    quiz_id: UUID
    study_guide: StudyGuide
    quiz: Quiz


class DocumentSummary(BaseModel):
    id: UUID
    title: str
    page_count: int
    created_at: datetime
    last_attempt_score: int | None = None


class DocumentList(BaseModel):
    items: list[DocumentSummary]
    next_cursor: str | None = None


class DocumentDownload(BaseModel):
    url: str
    expires_in: int


class DocumentUpdate(BaseModel):
    title: str


class AttemptCreate(BaseModel):
    quiz_id: UUID
    answers: list[Literal[0, 1, 2, 3]]


class PerQuestionResult(BaseModel):
    question_id: UUID
    correct: bool


class AttemptResult(BaseModel):
    attempt_id: UUID
    score: int
    per_question: list[PerQuestionResult]


class AttemptDetail(BaseModel):
    attempt_id: UUID
    document_id: UUID
    score: int
    answers: list[int]
    created_at: datetime


class AuthMeAnonymous(BaseModel):
    user_id: UUID
    anonymous: Literal[True]


class AuthMeAuthenticated(BaseModel):
    user_id: UUID
    email: str
    name: str | None = None
    picture: str | None = None
    anonymous: Literal[False]


AuthMeResponse = AuthMeAnonymous | AuthMeAuthenticated
