from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.core.time import utcnow


class Attempt(SQLModel, table=True):
    __tablename__ = "attempt"
    __table_args__ = (Index("ix_attempt_doc_created", "document_id", "created_at"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="document.id", index=True)
    answers: list[int] = Field(sa_column=Column(JSONB, nullable=False))
    score: int
    created_at: datetime = Field(default_factory=utcnow)
