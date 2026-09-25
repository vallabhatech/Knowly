from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.core.time import utcnow


class StudyGuideRow(SQLModel, table=True):
    __tablename__ = "study_guide"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="document.id", unique=True)
    title: str
    summary: str
    key_concepts: list[dict[str, Any]] = Field(sa_column=Column(JSONB, nullable=False))
    flashcards: list[dict[str, Any]] = Field(sa_column=Column(JSONB, nullable=False))
    created_at: datetime = Field(default_factory=utcnow)
