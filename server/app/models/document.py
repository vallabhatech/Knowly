from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Index
from sqlmodel import Field, SQLModel

from app.core.time import utcnow


class Document(SQLModel, table=True):
    __tablename__ = "document"
    __table_args__ = (
        Index("ix_document_user_created", "user_id", "created_at"),
        Index("ix_document_text_hash", "text_hash"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    title: str
    storage_key: str
    page_count: int
    byte_size: int
    text_hash: str
    created_at: datetime = Field(default_factory=utcnow)
    deleted_at: datetime | None = None
