from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.study_guide import StudyGuide


class Question(BaseModel):
    id: UUID
    prompt: str
    options: tuple[str, str, str, str]
    correct_index: Literal[0, 1, 2, 3]
    explanation: str
    source_quote: str = Field(max_length=200)


class Quiz(BaseModel):
    questions: list[Question] = Field(min_length=10, max_length=10)


class StudyGuideAndQuiz(BaseModel):
    """Wrapper used as Gemini response_schema."""

    study_guide: StudyGuide
    quiz: Quiz
