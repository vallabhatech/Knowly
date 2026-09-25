from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Response
from itsdangerous import BadSignature, URLSafeSerializer
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings, get_settings
from app.services.auth import SESSION_COOKIE_NAME, make_session_cookie, read_session_cookie

_engine = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def _to_async_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    return url


def _get_sessionmaker(settings: Settings) -> async_sessionmaker[AsyncSession]:
    global _engine, _sessionmaker
    if _sessionmaker is None:
        _engine = create_async_engine(_to_async_url(settings.database_url), pool_pre_ping=True)
        _sessionmaker = async_sessionmaker(_engine, expire_on_commit=False)
    return _sessionmaker


async def get_db(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncGenerator[AsyncSession, None]:
    maker = _get_sessionmaker(settings)
    async with maker() as session:
        yield session


COOKIE_NAME = "sg_uid"


def read_anonymous_user_id(request: Request, settings: Settings) -> str | None:
    serializer = URLSafeSerializer(settings.cookie_secret, salt="user-id")
    raw = request.cookies.get(COOKIE_NAME)
    if raw:
        try:
            return serializer.loads(raw)
        except BadSignature:
            pass
    return None


def ensure_anonymous_user_id(request: Request, response: Response, settings: Settings) -> str:
    serializer = URLSafeSerializer(settings.cookie_secret, salt="user-id")
    user_id = read_anonymous_user_id(request, settings)
    if user_id is not None:
        return user_id

    from uuid import uuid4

    user_id = str(uuid4())
    response.set_cookie(
        key=COOKIE_NAME,
        value=serializer.dumps(user_id),
        httponly=True,
        secure=settings.env == "production",
        samesite="lax",
        max_age=60 * 60 * 24 * 365,
    )
    return user_id


def get_user_id(
    request: Request,
    response: Response,
    settings: Annotated[Settings, Depends(get_settings)],
) -> str:
    session = read_session_cookie(request.cookies.get(SESSION_COOKIE_NAME), settings)
    if session is not None:
        if session.should_rotate:
            response.set_cookie(
                key=SESSION_COOKIE_NAME,
                value=make_session_cookie(session.user_id, settings),
                httponly=True,
                secure=settings.env == "production",
                samesite="lax",
                max_age=60 * 60 * 24 * 30,
            )
        return session.user_id

    if request.cookies.get(SESSION_COOKIE_NAME):
        response.delete_cookie(key=SESSION_COOKIE_NAME, samesite="lax")

    return ensure_anonymous_user_id(request, response, settings)


def get_authenticated_user_id(
    request: Request,
    response: Response,
    settings: Annotated[Settings, Depends(get_settings)],
) -> str:
    session = read_session_cookie(request.cookies.get(SESSION_COOKIE_NAME), settings)
    if session is None:
        raise HTTPException(status_code=401, detail="Sign in required")
    if session.should_rotate:
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=make_session_cookie(session.user_id, settings),
            httponly=True,
            secure=settings.env == "production",
            samesite="lax",
            max_age=60 * 60 * 24 * 30,
        )
    return session.user_id
