from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.deps import get_db, get_user_id
from app.models import Attempt, Document, QuestionRow, QuizRow
from app.schemas.api import AttemptCreate, AttemptDetail, AttemptResult, PerQuestionResult

router = APIRouter()


@router.post("", response_model=AttemptResult)
async def submit_attempt(
    payload: AttemptCreate,
    user_id: Annotated[str, Depends(get_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AttemptResult:
    user_uuid = UUID(user_id)

    quiz_row = (
        await db.execute(select(QuizRow).where(QuizRow.id == payload.quiz_id))
    ).scalar_one_or_none()
    if quiz_row is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    doc = (
        await db.execute(
            select(Document)
            .where(Document.id == quiz_row.document_id)
            .where(Document.user_id == user_uuid)
            .where(col(Document.deleted_at).is_(None))
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    q_rows = (
        await db.execute(
            select(QuestionRow)
            .where(QuestionRow.quiz_id == quiz_row.id)
            .order_by(col(QuestionRow.position).asc())
        )
    ).scalars().all()

    if len(payload.answers) != len(q_rows):
        raise HTTPException(status_code=400, detail="Answer count does not match quiz length")

    per_question: list[PerQuestionResult] = []
    correct = 0
    for q, ans in zip(q_rows, payload.answers, strict=True):
        ok = ans == q.correct_index
        if ok:
            correct += 1
        per_question.append(PerQuestionResult(question_id=q.id, correct=ok))

    score = round(100 * correct / len(q_rows)) if q_rows else 0

    attempt = Attempt(
        document_id=doc.id,
        answers=list(payload.answers),
        score=score,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return AttemptResult(
        attempt_id=attempt.id,
        score=score,
        per_question=per_question,
    )


@router.get("/{attempt_id}", response_model=AttemptDetail)
async def get_attempt(
    attempt_id: UUID,
    user_id: Annotated[str, Depends(get_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AttemptDetail:
    user_uuid = UUID(user_id)

    row = (
        await db.execute(
            select(Attempt)
            .join(Document, Document.id == Attempt.document_id)
            .where(Attempt.id == attempt_id)
            .where(Document.user_id == user_uuid)
            .where(col(Document.deleted_at).is_(None))
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Attempt not found")

    return AttemptDetail(
        attempt_id=row.id,
        document_id=row.document_id,
        score=row.score,
        answers=list(row.answers),
        created_at=row.created_at,
    )
