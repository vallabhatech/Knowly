from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel

from app.core.time import utcnow


class User(SQLModel, table=True):
    __tablename__ = "user"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    email: str | None = Field(default=None, max_length=254)
    auth_provider: str | None = Field(default=None, max_length=16)
    name: str | None = Field(default=None, max_length=200)
    picture: str | None = Field(default=None)
    last_login_at: datetime | None = Field(default=None)
