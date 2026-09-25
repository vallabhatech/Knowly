from collections.abc import Sequence
from uuid import uuid4

from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field, ValidationError

from app.core.config import get_settings
from app.schemas.quiz import StudyGuideAndQuiz
from app.schemas.study_guide import StudyGuide

PROMPT = """\
You are an expert tutor. Given the document below, produce a JSON object
matching the provided schema. Rules:
- Quiz questions must be answerable ONLY from this document.
- Each question's `source_quote` must be a verbatim <=25-word excerpt.
- Flashcards cover the most testable facts, not trivia.
- Summary uses plain language at a college-freshman reading level.

DOCUMENT:
<<<{extracted_text}>>>
"""


async def generate(text: str) -> StudyGuideAndQuiz:
    """Single structured call to Gemini returning study guide + quiz.

    On Pydantic ValidationError, retry once with the error appended.
    """
    prompt = PROMPT.format(extracted_text=text)
    try:
        return await _generate_once(prompt)
    except ValidationError as exc:
        retry_prompt = (
            f"{prompt}\n\nYour previous response failed validation: {exc}. "
            "Return ONLY valid JSON matching the schema."
        )
        return await _generate_once(retry_prompt)


async def vision_ocr(rendered_pages: list[bytes]) -> str:
    """Fallback: send page images to Gemini multimodal for text extraction."""
    if not rendered_pages:
        return ""

    parts: list[types.Part | str] = [
        "Extract all readable text from these PDF page images. Return plain text only."
    ]
    for page in rendered_pages:
        parts.append(types.Part.from_bytes(data=page, mime_type="image/png"))

    client = _client()
    try:
        async with client.aio as aio:
            response = await aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=parts,
            )
    except errors.APIError as exc:
        if exc.status == 429:
            raise GeminiRateLimit(_retry_after(exc)) from exc
        raise
    return response.text or ""


async def _generate_once(prompt: str) -> StudyGuideAndQuiz:
    client = _client()
    try:
        async with client.aio as aio:
            response = await aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=_GeminiStudyGuideAndQuiz,
                ),
            )
    except errors.APIError as exc:
        if exc.status == 429:
            raise GeminiRateLimit(_retry_after(exc)) from exc
        raise

    if not response.text:
        raise ValueError("Gemini returned an empty response")
    parsed = _GeminiStudyGuideAndQuiz.model_validate_json(response.text)
    return _to_public_model(parsed)


def _client() -> genai.Client:
    return genai.Client(api_key=get_settings().gemini_api_key)


class _GeminiQuestion(BaseModel):
    prompt: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    explanation: str
    source_quote: str = Field(max_length=200)


class _GeminiQuiz(BaseModel):
    questions: list[_GeminiQuestion] = Field(min_length=10, max_length=10)


class _GeminiStudyGuideAndQuiz(BaseModel):
    study_guide: StudyGuide
    quiz: _GeminiQuiz


def _to_public_model(parsed: _GeminiStudyGuideAndQuiz) -> StudyGuideAndQuiz:
    payload = parsed.model_dump(mode="json")
    for question in payload["quiz"]["questions"]:
        question["id"] = str(uuid4())
    return StudyGuideAndQuiz.model_validate(payload)


class GeminiRateLimit(Exception):
    def __init__(self, retry_after: int = 60) -> None:
        self.retry_after = retry_after
        super().__init__("Gemini rate limit exceeded")


def _retry_after(exc: errors.APIError) -> int:
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    raw = None
    if headers is not None:
        raw = headers.get("retry-after")
    if raw is None:
        raw = _find_retry_delay(getattr(exc, "args", ()))
    try:
        return max(1, int(raw)) if raw is not None else 60
    except ValueError:
        return 60


def _find_retry_delay(values: Sequence[object]) -> str | None:
    for value in values:
        if isinstance(value, dict):
            retry_delay = value.get("retryDelay") or value.get("retry_delay")
            if retry_delay is not None:
                return str(retry_delay).rstrip("s")
            nested = _find_retry_delay(tuple(value.values()))
            if nested is not None:
                return nested
        elif isinstance(value, list | tuple):
            nested = _find_retry_delay(tuple(value))
            if nested is not None:
                return nested
    return None
