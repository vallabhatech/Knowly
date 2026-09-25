import hashlib
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.models import Document


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def find(db: AsyncSession, user_id: UUID, hash_: str) -> UUID | None:
    """Return existing Document.id with matching (user_id, text_hash), or None."""
    result = await db.execute(
        select(Document.id)
        .where(Document.user_id == user_id)
        .where(Document.text_hash == hash_)
        .where(col(Document.deleted_at).is_(None))
        .limit(1)
    )
    return result.scalar_one_or_none()
