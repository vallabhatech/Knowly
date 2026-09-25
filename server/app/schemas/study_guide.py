from pydantic import BaseModel, Field


class KeyConcept(BaseModel):
    term: str
    definition: str
    related_terms: list[str] = Field(default_factory=list)


class Flashcard(BaseModel):
    front: str
    back: str


class StudyGuide(BaseModel):
    title: str
    summary: str
    key_concepts: list[KeyConcept]
    flashcards: list[Flashcard] = Field(min_length=8, max_length=15)
