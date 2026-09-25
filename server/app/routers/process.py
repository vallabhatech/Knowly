import asyncio
import logging
import os
import time
import uuid
from collections.abc import Awaitable
from pathlib import Path
from typing import Annotated, TypeVar
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from pydantic import ValidationError
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.errors import StorageError
from app.deps import get_db, get_user_id
from app.models import Document, QuestionRow, QuizRow, StudyGuideRow, User
from app.schemas.api import ProcessResponse
from app.schemas.quiz import Question, Quiz
from app.schemas.study_guide import StudyGuide
from app.services import dedupe, gemini, pdf, storage

router = APIRouter()
logger = logging.getLogger(__name__)

TMP_DIR = Path("/tmp")
T = TypeVar("T")


@router.post("/process", response_model=ProcessResponse)
async def process_document(
    background: BackgroundTasks,
    file: Annotated[UploadFile, File()],
    title: Annotated[str | None, Form()] = None,
    user_id: Annotated[str, Depends(get_user_id)] = ...,
    db: Annotated[AsyncSession, Depends(get_db)] = ...,
) -> ProcessResponse:
    user_uuid = UUID(user_id)
    document_id = uuid.uuid4()

    tmp_path = TMP_DIR / f"{document_id}.pdf"
    contents = await file.read()
    tmp_path.write_bytes(contents)
    background.add_task(_safe_remove, str(tmp_path))

    extracted_text = await pdf.extract_text(tmp_path)
    hash_ = dedupe.text_hash(extracted_text)

    resolved_title = (title or _strip_ext(file.filename) or "Untitled").strip() or "Untitled"

    await db.execute(
        pg_insert(User).values(id=user_uuid).on_conflict_do_nothing(index_elements=["id"])
    )

    cached_document_id = await dedupe.find(db, user_uuid, hash_)
    if cached_document_id is not None:
        return await _build_process_response(db, cached_document_id)

    try:
        async with asyncio.TaskGroup() as tg:
            generated_task = tg.create_task(_timed(gemini.generate(extracted_text)))
            storage_task = tg.create_task(
                _timed(storage.put(str(user_uuid), str(document_id), tmp_path))
            )
    except* gemini.GeminiRateLimit as errors:
        raise errors.exceptions[0]
    except* StorageError as errors:
        raise errors.exceptions[0]
    except* ValidationError as errors:
        raise errors.exceptions[0]

    generated, gemini_ms = generated_task.result()
    storage_key, storage_ms = storage_task.result()
    logger.info(
        "process_concurrent_io_complete",
        extra={
            "document_id": str(document_id),
            "gemini_ms": round(gemini_ms, 2),
            "storage_ms": round(storage_ms, 2),
        },
    )

    document = Document(
        id=document_id,
        user_id=user_uuid,
        title=resolved_title,
        storage_key=storage_key,
        page_count=_count_pages(tmp_path),
        byte_size=len(contents),
        text_hash=hash_,
    )
    db.add(document)
    await db.flush()

    study_guide_row = StudyGuideRow(
        document_id=document_id,
        title=generated.study_guide.title,
        summary=generated.study_guide.summary,
        key_concepts=[item.model_dump(mode="json") for item in generated.study_guide.key_concepts],
        flashcards=[item.model_dump(mode="json") for item in generated.study_guide.flashcards],
    )
    db.add(study_guide_row)

    quiz_row = QuizRow(document_id=document_id)
    db.add(quiz_row)
    await db.flush()

    questions: list[Question] = []
    for position, q in enumerate(generated.quiz.questions):
        db.add(
            QuestionRow(
                id=q.id,
                quiz_id=quiz_row.id,
                position=position,
                prompt=q.prompt,
                options=list(q.options),
                correct_index=q.correct_index,
                explanation=q.explanation,
                source_quote=q.source_quote,
            )
        )
        questions.append(q)

    await db.commit()

    return ProcessResponse(
        document_id=document_id,
        quiz_id=quiz_row.id,
        study_guide=generated.study_guide,
        quiz=Quiz(questions=questions),
    )


async def _build_process_response(db: AsyncSession, document_id: UUID) -> ProcessResponse:
    sg_row = (
        await db.execute(select(StudyGuideRow).where(StudyGuideRow.document_id == document_id))
    ).scalar_one()

    quiz_row = (
        await db.execute(select(QuizRow).where(QuizRow.document_id == document_id))
    ).scalar_one()

    q_rows = (
        await db.execute(
            select(QuestionRow)
            .where(QuestionRow.quiz_id == quiz_row.id)
            .order_by(col(QuestionRow.position).asc())
        )
    ).scalars().all()

    return ProcessResponse(
        document_id=document_id,
        quiz_id=quiz_row.id,
        study_guide=StudyGuide(
            title=sg_row.title,
            summary=sg_row.summary,
            key_concepts=sg_row.key_concepts,
            flashcards=sg_row.flashcards,
        ),
        quiz=Quiz(
            questions=[
                Question(
                    id=q.id,
                    prompt=q.prompt,
                    options=tuple(q.options),  # type: ignore[arg-type]
                    correct_index=q.correct_index,
                    explanation=q.explanation,
                    source_quote=q.source_quote,
                )
                for q in q_rows
            ]
        ),
    )


def _strip_ext(name: str | None) -> str | None:
    if not name:
        return None
    return name.rsplit(".", 1)[0] if "." in name else name


def _safe_remove(path: str) -> None:
    try:
        os.remove(path)
    except FileNotFoundError:
        pass


async def _timed(awaitable: Awaitable[T]) -> tuple[T, float]:
    started = time.perf_counter()
    result = await awaitable
    return result, (time.perf_counter() - started) * 1000


def _count_pages(path: Path) -> int:
    try:
        reader = PdfReader(str(path))
        return max(1, len(reader.pages))
    except Exception:
        return 1
