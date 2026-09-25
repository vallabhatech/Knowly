import logging
import os
from contextlib import asynccontextmanager
from typing import Annotated

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.errors import AppError, OcrTooShortError, StorageError
from app.core.logging import configure_logging
from app.deps import get_user_id
from app.jobs import orphan_sweep
from app.routers import attempts, auth, chat, documents, process
from app.services.gemini import GeminiRateLimit

logger = logging.getLogger(__name__)


async def _run_orphan_sweep() -> None:
    try:
        await orphan_sweep.run()
    except Exception as exc:
        logger.exception("orphan_sweep_failed", exc_info=exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    scheduler: AsyncIOScheduler | None = None
    if os.getenv("DISABLE_SCHEDULER") != "1":
        scheduler = AsyncIOScheduler(timezone="UTC")
        scheduler.add_job(
            _run_orphan_sweep,
            CronTrigger(hour=3, minute=0),
            id="orphan_sweep",
            replace_existing=True,
            misfire_grace_time=3600,
        )
        scheduler.start()
        logger.info("scheduler_started job=orphan_sweep cron='0 3 * * *' tz=UTC")
    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=False)


def _error_response(
    *, status_code: int, code: str, message: str, headers: dict[str, str] | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"detail": message, "code": code},
        headers=headers,
    )


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="SnapStudy API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(process.router, prefix="/api", tags=["process"])
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
    app.include_router(attempts.router, prefix="/api/attempts", tags=["attempts"])
    app.include_router(chat.router, prefix="/api", tags=["chat"])

    @app.exception_handler(GeminiRateLimit)
    async def gemini_rate_limit_handler(
        request: Request, exc: GeminiRateLimit
    ) -> JSONResponse:
        return _error_response(
            status_code=429,
            code="rate_limited",
            message="We're studying a lot right now. Please try again shortly.",
            headers={"Retry-After": str(exc.retry_after)},
        )

    @app.exception_handler(OcrTooShortError)
    async def ocr_too_short_handler(
        request: Request, exc: OcrTooShortError
    ) -> JSONResponse:
        return _error_response(
            status_code=exc.status_code, code=exc.code, message=exc.public_message
        )

    @app.exception_handler(StorageError)
    async def storage_error_handler(request: Request, exc: StorageError) -> JSONResponse:
        logger.exception("storage_error", exc_info=exc)
        return _error_response(
            status_code=exc.status_code, code=exc.code, message=exc.public_message
        )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return _error_response(
            status_code=exc.status_code, code=exc.code, message=exc.public_message
        )

    @app.exception_handler(ValidationError)
    async def pydantic_validation_error_handler(
        request: Request, exc: ValidationError
    ) -> JSONResponse:
        logger.warning("pydantic_validation_error", exc_info=exc)
        return _error_response(
            status_code=502,
            code="upstream_invalid",
            message="The study guide came back in an unexpected shape. Please try again.",
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _error_response(
            status_code=422,
            code="invalid_request",
            message="That request didn't look right. Please double-check and try again.",
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return _error_response(
            status_code=exc.status_code,
            code=f"http_{exc.status_code}",
            message=detail,
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("unhandled_exception", exc_info=exc)
        return _error_response(
            status_code=500,
            code="internal_error",
            message="Something went wrong on our end. Please try again.",
        )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/whoami")
    async def whoami(user_id: Annotated[str, Depends(get_user_id)]) -> dict[str, str]:
        return {"user_id": user_id}

    return app


app = create_app()
