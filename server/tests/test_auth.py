from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from itsdangerous import URLSafeSerializer
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.deps import COOKIE_NAME
from app.main import app
from app.models import Document, User
from app.services.auth import (
    OAUTH_STATE_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    GoogleProfile,
    make_oauth_state_cookie,
    make_session_cookie,
)


def _anon_cookie(user_id: UUID) -> str:
    settings = get_settings()
    return URLSafeSerializer(settings.cookie_secret, salt="user-id").dumps(str(user_id))


def _profile(email: str = "student@example.com") -> GoogleProfile:
    return GoogleProfile(
        sub="google-sub-123",
        email=email,
        email_verified=True,
        name="Student Example",
        picture="https://example.com/avatar.png",
    )


async def _sessionmaker() -> async_sessionmaker:
    engine = create_async_engine(get_settings().database_url)
    return async_sessionmaker(engine, expire_on_commit=False)


async def _seed_anonymous_documents(source_id: UUID) -> list[UUID]:
    maker = await _sessionmaker()
    doc_ids = [uuid4(), uuid4()]
    async with maker() as session:
        session.add(User(id=source_id))
        await session.flush()
        for i, doc_id in enumerate(doc_ids):
            session.add(
                Document(
                    id=doc_id,
                    user_id=source_id,
                    title=f"Phase 13 auth merge {doc_id}",
                    storage_key=f"docs/{source_id}/{doc_id}.pdf",
                    page_count=i + 1,
                    byte_size=100 + i,
                    text_hash=f"phase-13-{doc_id}",
                )
            )
        await session.commit()
    await maker.kw["bind"].dispose()
    return doc_ids


async def _cleanup_phase13_rows() -> None:
    maker = await _sessionmaker()
    async with maker() as session:
        await session.execute(delete(Document).where(Document.title.like("Phase 13 auth merge%")))
        await session.execute(
            delete(User).where(func.lower(User.email).in_(["merge@example.com", "same@example.com", "me@example.com"]))
        )
        await session.commit()
    await maker.kw["bind"].dispose()


@pytest.mark.asyncio
async def test_first_google_login_merges_anonymous_documents(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def exchange_code(_code, _settings):
        return _profile("Merge@Example.com")

    monkeypatch.setattr("app.routers.auth.exchange_code", exchange_code)
    settings = get_settings()
    await _cleanup_phase13_rows()
    source_id = uuid4()
    doc_ids = await _seed_anonymous_documents(source_id)
    state = "state-123"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.cookies.set(COOKIE_NAME, _anon_cookie(source_id))
        client.cookies.set(OAUTH_STATE_COOKIE_NAME, make_oauth_state_cookie(state, "/", settings))

        resp = await client.get(
            f"/api/auth/callback/google?code=ok&state={state}",
            follow_redirects=False,
        )

        assert resp.status_code == 302
        assert SESSION_COOKIE_NAME in resp.headers.get("set-cookie", "")
        assert client.cookies.get(COOKIE_NAME) is not None

    maker = await _sessionmaker()
    async with maker() as session:
        authed = (
            await session.execute(select(User).where(User.email == "merge@example.com"))
        ).scalar_one()
        docs = (
            await session.execute(select(Document).where(Document.id.in_(doc_ids)))
        ).scalars().all()
        assert {doc.user_id for doc in docs} == {authed.id}
        assert await session.get(User, source_id) is None
        await session.execute(delete(Document).where(Document.id.in_(doc_ids)))
        await session.execute(delete(User).where(User.id == authed.id))
        await session.commit()
    await maker.kw["bind"].dispose()


@pytest.mark.asyncio
async def test_google_login_on_second_device_reuses_authenticated_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def exchange_code(_code, _settings):
        return _profile("same@example.com")

    monkeypatch.setattr("app.routers.auth.exchange_code", exchange_code)
    settings = get_settings()
    await _cleanup_phase13_rows()
    maker = await _sessionmaker()
    async with maker() as session:
        user = User(email="same@example.com", auth_provider="google")
        session.add(user)
        await session.commit()
        existing_id = user.id
    await maker.kw["bind"].dispose()

    state = "state-456"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.cookies.set(OAUTH_STATE_COOKIE_NAME, make_oauth_state_cookie(state, "/", settings))
        resp = await client.get(
            f"/api/auth/callback/google?code=ok&state={state}",
            follow_redirects=False,
        )
        assert resp.status_code == 302

    maker = await _sessionmaker()
    async with maker() as session:
        users = (
            await session.execute(select(User).where(User.email == "same@example.com"))
        ).scalars().all()
        assert len(users) == 1
        assert users[0].id == existing_id
        await session.delete(users[0])
        await session.commit()
    await maker.kw["bind"].dispose()


@pytest.mark.asyncio
async def test_tampered_session_falls_back_to_anonymous() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.cookies.set(SESSION_COOKIE_NAME, "not-a-real-session")
        resp = await client.get("/api/auth/me")

    assert resp.status_code == 200
    assert resp.json()["anonymous"] is True
    assert COOKIE_NAME in resp.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_callback_rejects_missing_state_cookie() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/callback/google?code=ok&state=missing")

    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_me_reflects_logged_in_and_anonymous() -> None:
    settings = get_settings()
    await _cleanup_phase13_rows()
    user_id = uuid4()
    maker = await _sessionmaker()
    async with maker() as session:
        session.add(
            User(
                id=user_id,
                email="me@example.com",
                auth_provider="google",
                name="Me User",
                picture="https://example.com/me.png",
            )
        )
        await session.commit()
    await maker.kw["bind"].dispose()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as authed:
        authed.cookies.set(SESSION_COOKIE_NAME, make_session_cookie(str(user_id), settings))
        logged_in = await authed.get("/api/auth/me")
        assert logged_in.status_code == 200
        assert logged_in.json() == {
            "user_id": str(user_id),
            "email": "me@example.com",
            "name": "Me User",
            "picture": "https://example.com/me.png",
            "anonymous": False,
        }

    async with AsyncClient(transport=transport, base_url="http://test") as anon:
        anonymous = await anon.get("/api/auth/me")
        assert anonymous.status_code == 200
        assert anonymous.json()["anonymous"] is True

    maker = await _sessionmaker()
    async with maker() as session:
        user = await session.get(User, user_id)
        if user is not None:
            await session.delete(user)
            await session.commit()
    await maker.kw["bind"].dispose()
