import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import select

from app.core.config import get_settings
from app.models import User


@pytest.mark.asyncio
async def test_user_round_trip() -> None:
    engine = create_async_engine(get_settings().database_url)
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    async with sessionmaker() as session:
        user = User()
        session.add(user)
        await session.commit()
        user_id = user.id

    async with sessionmaker() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        fetched = result.scalar_one()
        assert fetched.id == user_id
        assert fetched.created_at is not None

        await session.delete(fetched)
        await session.commit()

    await engine.dispose()
