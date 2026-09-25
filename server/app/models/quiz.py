from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.core.time import utcnow


class QuizRow(SQLModel, table=True):
    __tablename__ = "quiz"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="document.id", unique=True)
    created_at: datetime = Field(default_factory=utcnow)


class QuestionRow(SQLModel, table=True):
    __tablename__ = "question"
    __table_args__ = (UniqueConstraint("quiz_id", "position", name="uq_question_quiz_position"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    quiz_id: UUID = Field(foreign_key="quiz.id", index=True)
    position: int
    prompt: str
    options: list[str] = Field(sa_column=Column(JSONB, nullable=False))
    correct_index: int
    explanation: str
    source_quote: str
