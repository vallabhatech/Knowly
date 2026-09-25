from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.time import utcnow
from app.deps import get_db, get_user_id
from app.models import Attempt, Document, QuestionRow, QuizRow, StudyGuideRow
from app.schemas.api import (
    DocumentDownload,
    DocumentList,
    DocumentSummary,
    DocumentUpdate,
    ProcessResponse,
)
from app.schemas.quiz import Question, Quiz
from app.schemas.study_guide import StudyGuide
from app.services import storage

router = APIRouter()


@router.get("", response_model=DocumentList)
async def list_documents(
    user_id: Annotated[str, Depends(get_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
    cursor: str | None = None,
    limit: int = 20,
) -> DocumentList:
    user_uuid = UUID(user_id)
    limit = max(1, min(limit, 100))

    stmt = (
        select(Document)
        .where(Document.user_id == user_uuid)
        .where(col(Document.deleted_at).is_(None))
        .order_by(col(Document.created_at).desc())
        .limit(limit)
    )
    docs = (await db.execute(stmt)).scalars().all()

    items: list[DocumentSummary] = []
    for doc in docs:
        score_stmt = (
            select(Attempt.score)
            .where(Attempt.document_id == doc.id)
            .order_by(col(Attempt.created_at).desc())
            .limit(1)
        )
        last_score = (await db.execute(score_stmt)).scalar_one_or_none()
        items.append(
            DocumentSummary(
                id=doc.id,
                title=doc.title,
                page_count=doc.page_count,
                created_at=doc.created_at,
                last_attempt_score=last_score,
            )
        )

    return DocumentList(items=items, next_cursor=None)


@router.get("/{document_id}", response_model=ProcessResponse)
async def get_document(
    document_id: UUID,
    user_id: Annotated[str, Depends(get_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProcessResponse:
    user_uuid = UUID(user_id)

    doc = (
        await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.user_id == user_uuid)
            .where(col(Document.deleted_at).is_(None))
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

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
        document_id=doc.id,
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


@router.get("/{document_id}/download", response_model=DocumentDownload)
async def download_document(
    document_id: UUID,
    user_id: Annotated[str, Depends(get_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentDownload:
    user_uuid = UUID(user_id)

    doc = (
        await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.user_id == user_uuid)
            .where(col(Document.deleted_at).is_(None))
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    expires_in = 300
    return DocumentDownload(
        url=await storage.signed_url(doc.storage_key, expires_in=expires_in),
        expires_in=expires_in,
    )


@router.patch("/{document_id}", response_model=DocumentSummary)
async def update_document(
    document_id: UUID,
    payload: DocumentUpdate,
    user_id: Annotated[str, Depends(get_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentSummary:
    user_uuid = UUID(user_id)

    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")
    if len(title) > 200:
        raise HTTPException(status_code=422, detail="Title is too long")

    doc = (
        await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.user_id == user_uuid)
            .where(col(Document.deleted_at).is_(None))
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.title = title
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    score_stmt = (
        select(Attempt.score)
        .where(Attempt.document_id == doc.id)
        .order_by(col(Attempt.created_at).desc())
        .limit(1)
    )
    last_score = (await db.execute(score_stmt)).scalar_one_or_none()

    return DocumentSummary(
        id=doc.id,
        title=doc.title,
        page_count=doc.page_count,
        created_at=doc.created_at,
        last_attempt_score=last_score,
    )


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: UUID,
    user_id: Annotated[str, Depends(get_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    user_uuid = UUID(user_id)

    doc = (
        await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.user_id == user_uuid)
            .where(col(Document.deleted_at).is_(None))
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.deleted_at = utcnow()
    db.add(doc)
    await db.commit()
