import json

import pytest
from pydantic import ValidationError

from app.services import gemini


def _valid_model_json() -> str:
    questions = []
    for index in range(10):
        questions.append(
            {
                "prompt": f"What is key fact {index}?",
                "options": ["A", "B", "C", "D"],
                "correct_index": 0,
                "explanation": "The document states the key fact directly.",
                "source_quote": "The document states the key fact.",
            }
        )

    return json.dumps(
        {
            "study_guide": {
                "title": "Generated Notes",
                "summary": "A concise summary of the uploaded notes.",
                "key_concepts": [
                    {
                        "term": "Key fact",
                        "definition": "A testable idea from the source document.",
                        "related_terms": [],
                    }
                ],
                "flashcards": [
                    {"front": f"Front {index}", "back": f"Back {index}"}
                    for index in range(8)
                ],
            },
            "quiz": {"questions": questions},
        }
    )


class _Response:
    def __init__(self, text: str) -> None:
        self.text = text


class _FakeModels:
    def __init__(self, responses: list[str]) -> None:
        self.responses = responses
        self.prompts: list[str] = []

    async def generate_content(self, **kwargs):
        self.prompts.append(kwargs["contents"])
        return _Response(self.responses.pop(0))


class _FakeClient:
    def __init__(self, models: _FakeModels) -> None:
        self.aio = _FakeAio(models)


class _FakeAio:
    def __init__(self, models: _FakeModels) -> None:
        self.models = models

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None


@pytest.mark.asyncio
async def test_generate_retries_once_after_invalid_json(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    models = _FakeModels(["not json", _valid_model_json()])
    monkeypatch.setattr(gemini.genai, "Client", lambda api_key: _FakeClient(models))

    result = await gemini.generate("source text")

    assert result.study_guide.title == "Generated Notes"
    assert len(models.prompts) == 2
    assert "previous response failed validation" in models.prompts[1]


@pytest.mark.asyncio
async def test_generate_raises_validation_error_after_second_bad_output(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    models = _FakeModels(["not json", "still not json"])
    monkeypatch.setattr(gemini.genai, "Client", lambda api_key: _FakeClient(models))

    with pytest.raises(ValidationError):
        await gemini.generate("source text")

    assert len(models.prompts) == 2
