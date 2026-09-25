import json
from functools import lru_cache
from pathlib import Path
from typing import Any

FIXTURE_PATH = (
    Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "study_guide_quiz.json"
)


@lru_cache
def load_fixture() -> dict[str, Any]:
    with FIXTURE_PATH.open() as f:
        return json.load(f)
