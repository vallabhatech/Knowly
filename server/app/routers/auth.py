import secrets
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.deps import ensure_anonymous_user_id, get_db, read_anonymous_user_id
from app.models import User
from app.schemas.api import AuthMeResponse
from app.services.auth import (
    OAUTH_STATE_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    exchange_code,
    get_or_create_google_user,
    is_safe_next_path,
    make_oauth_state_cookie,
    make_session_cookie,
    merge_anonymous_into,
    oauth_login_url,
    read_oauth_state_cookie,
    read_session_cookie,
)

router = APIRouter()


@router.get("/login/google")
async def login_google(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    next: str = "/",
) -> RedirectResponse:
    if not settings.google_oauth_client_id or not settings.google_oauth_client_secret:
        raise HTTPException(status_code=500, detail="Google sign-in is not configured")

    next_path = next if is_safe_next_path(next) else "/"
    state = secrets.token_urlsafe(32)
    response = RedirectResponse(oauth_login_url(state, settings), status_code=302)
    is_https = request.url.scheme == "https"
    response.set_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        value=make_oauth_state_cookie(state, next_path, settings),
        httponly=True,
        secure=is_https,
        samesite="none" if is_https else "lax",
        path="/",
        max_age=10 * 60,
    )
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("/callback/google")
async def callback_google(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[AsyncSession, Depends(get_db)],
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    if error:
        raise HTTPException(status_code=400, detail="Google sign-in was cancelled")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Google sign-in response was incomplete")

    saved_state = read_oauth_state_cookie(request.cookies.get(OAUTH_STATE_COOKIE_NAME), settings)
    if saved_state is None or not secrets.compare_digest(saved_state.state, state):
        raise HTTPException(status_code=400, detail="Google sign-in state expired")

    anonymous_user_id = _parse_uuid(read_anonymous_user_id(request, settings))
    profile = await exchange_code(code, settings)
    user = await get_or_create_google_user(db, profile)
    await merge_anonymous_into(db, user.id, anonymous_user_id)
    await db.commit()

    next_path = saved_state.next_path if is_safe_next_path(saved_state.next_path) else "/"
    redirect_target = f"{settings.frontend_url.rstrip('/')}{next_path}"
    response = RedirectResponse(redirect_target, status_code=302)
    is_https = request.url.scheme == "https"
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=make_session_cookie(str(user.id), settings),
        httponly=True,
        secure=is_https,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 30,
    )
    response.delete_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        path="/",
        samesite="none" if is_https else "lax",
        secure=is_https,
    )
    return response


@router.post("/logout", status_code=204)
async def logout(request: Request) -> Response:
    response = Response(status_code=204)
    is_https = request.url.scheme == "https"
    response.delete_cookie(
        key=SESSION_COOKIE_NAME, path="/", samesite="lax", secure=is_https
    )
    return response


@router.get("/me", response_model=AuthMeResponse)
async def me(
    request: Request,
    response: Response,
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthMeResponse:
    is_https = request.url.scheme == "https"
    session = read_session_cookie(request.cookies.get(SESSION_COOKIE_NAME), settings)
    if session is not None:
        user = (
            await db.execute(select(User).where(User.id == UUID(session.user_id)))
        ).scalar_one_or_none()
        if user is not None and user.email is not None:
            if session.should_rotate:
                response.set_cookie(
                    key=SESSION_COOKIE_NAME,
                    value=make_session_cookie(session.user_id, settings),
                    httponly=True,
                    secure=is_https,
                    samesite="lax",
                    path="/",
                    max_age=60 * 60 * 24 * 30,
                )
            return {
                "user_id": str(user.id),
                "email": user.email,
                "name": user.name,
                "picture": user.picture,
                "anonymous": False,
            }
        response.delete_cookie(
            key=SESSION_COOKIE_NAME, path="/", samesite="lax", secure=is_https
        )
    elif request.cookies.get(SESSION_COOKIE_NAME):
        response.delete_cookie(
            key=SESSION_COOKIE_NAME, path="/", samesite="lax", secure=is_https
        )

    user_id = ensure_anonymous_user_id(request, response, settings)
    return {"user_id": user_id, "anonymous": True}


def _parse_uuid(value: str | None) -> UUID | None:
    if value is None:
        return None
    try:
        return UUID(value)
    except ValueError:
        return None
