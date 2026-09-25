from __future__ import annotations

from dataclasses import dataclass
from time import time
from uuid import UUID

import httpx
from fastapi import HTTPException
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.time import utcnow
from app.models import Document, User

SESSION_COOKIE_NAME = "sg_session"
OAUTH_STATE_COOKIE_NAME = "sg_oauth_state"
SESSION_MAX_AGE = 30 * 24 * 60 * 60
SESSION_ROTATE_WINDOW = 7 * 24 * 60 * 60
OAUTH_STATE_MAX_AGE = 10 * 60
GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


@dataclass(frozen=True)
class GoogleProfile:
    sub: str
    email: str
    email_verified: bool
    name: str | None = None
    picture: str | None = None


@dataclass(frozen=True)
class SessionInfo:
    user_id: str
    should_rotate: bool = False


@dataclass(frozen=True)
class OAuthState:
    state: str
    next_path: str = "/"


def oauth_login_url(state: str, settings: Settings) -> str:
    params = httpx.QueryParams(
        {
            "client_id": settings.google_oauth_client_id,
            "redirect_uri": settings.oauth_redirect_url,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "select_account",
        }
    )
    return f"{GOOGLE_AUTHORIZE_URL}?{params}"


async def exchange_code(code: str, settings: Settings) -> GoogleProfile:
    async with httpx.AsyncClient(timeout=10) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "redirect_uri": settings.oauth_redirect_url,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code >= 400:
            raise HTTPException(status_code=400, detail="Google sign-in failed")
        token_payload = token_resp.json()
        access_token = token_payload.get("access_token")
        if not isinstance(access_token, str) or not access_token:
            raise HTTPException(status_code=400, detail="Google sign-in failed")

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        )
        if userinfo_resp.status_code >= 400:
            raise HTTPException(status_code=400, detail="Google profile could not be loaded")
        payload = userinfo_resp.json()

    email = payload.get("email")
    sub = payload.get("sub")
    verified = payload.get("email_verified", False)
    if isinstance(verified, str):
        verified = verified.lower() == "true"
    if not isinstance(email, str) or not isinstance(sub, str) or not verified:
        raise HTTPException(status_code=400, detail="Google email must be verified")

    name = payload.get("name")
    picture = payload.get("picture")
    return GoogleProfile(
        sub=sub,
        email=email.strip().lower(),
        email_verified=True,
        name=name if isinstance(name, str) else None,
        picture=picture if isinstance(picture, str) else None,
    )


def _session_serializer(settings: Settings) -> URLSafeTimedSerializer:
    secret = settings.cookie_secret
    return URLSafeTimedSerializer(secret, salt="session")


def _state_serializer(settings: Settings) -> URLSafeTimedSerializer:
    secret = settings.cookie_secret
    return URLSafeTimedSerializer(secret, salt="oauth-state")


def make_session_cookie(user_id: str, settings: Settings) -> str:
    expires_at = int(time()) + SESSION_MAX_AGE
    return _session_serializer(settings).dumps({"user_id": user_id, "exp": expires_at})


def read_session_cookie(raw: str | None, settings: Settings) -> SessionInfo | None:
    if not raw:
        return None
    try:
        payload = _session_serializer(settings).loads(raw, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    if not isinstance(payload, dict):
        return None
    user_id = payload.get("user_id")
    exp = payload.get("exp")
    if not isinstance(user_id, str) or not isinstance(exp, int):
        return None
    if exp <= int(time()):
        return None
    try:
        UUID(user_id)
    except ValueError:
        return None
    return SessionInfo(user_id=user_id, should_rotate=(exp - int(time())) <= SESSION_ROTATE_WINDOW)


def make_oauth_state_cookie(state: str, next_path: str, settings: Settings) -> str:
    return _state_serializer(settings).dumps({"state": state, "next": next_path})


def read_oauth_state_cookie(raw: str | None, settings: Settings) -> OAuthState | None:
    if not raw:
        return None
    try:
        payload = _state_serializer(settings).loads(raw, max_age=OAUTH_STATE_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    if not isinstance(payload, dict):
        return None
    state = payload.get("state")
    next_path = payload.get("next", "/")
    if not isinstance(state, str):
        return None
    if not isinstance(next_path, str) or not is_safe_next_path(next_path):
        next_path = "/"
    return OAuthState(state=state, next_path=next_path)


def is_safe_next_path(next_path: str | None) -> bool:
    return bool(next_path) and next_path.startswith("/") and not next_path.startswith("//")


async def get_or_create_google_user(db: AsyncSession, profile: GoogleProfile) -> User:
    email = profile.email.strip().lower()
    stmt = select(User).where(func.lower(User.email) == email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    now = utcnow()
    if user is None:
        user = User(
            email=email,
            auth_provider="google",
            name=profile.name,
            picture=profile.picture,
            last_login_at=now,
        )
    else:
        user.email = email
        user.auth_provider = "google"
        user.name = profile.name
        user.picture = profile.picture
        user.last_login_at = now
    db.add(user)
    await db.flush()
    return user


async def merge_anonymous_into(
    db: AsyncSession,
    target_user_id: UUID,
    source_user_id: UUID | None,
) -> None:
    if source_user_id is None or source_user_id == target_user_id:
        await db.execute(update(User).where(User.id == target_user_id).values(last_login_at=utcnow()))
        return

    await db.execute(
        update(Document).where(Document.user_id == source_user_id).values(user_id=target_user_id)
    )
    await db.execute(update(User).where(User.id == target_user_id).values(last_login_at=utcnow()))
    await db.execute(
        delete(User).where(User.id == source_user_id).where(User.email.is_(None))
    )
