from google import genai
from google.genai import errors, types

from app.core.config import get_settings
from app.services.gemini import GeminiRateLimit, _retry_after

BASE_PROMPT = """\
You are Sage, an expert tutor embedded in a study guide. Answer as a domain
professional in whatever field the guide covers (biology, history, CS, etc.).

Hard rules for every reply:
- Be concise. 1–3 short sentences. No preamble, no recap of the question.
- Lead with the answer. Add at most one short clarifier or example.
- Plain language. No filler ("Great question!", "Sure!", "I hope this helps").
- No bullet lists, no headings, no markdown sections — prose only.
- If the question is ambiguous, ask one brief clarifying question instead of guessing.
- Never invent citations or page numbers. If you don't know, say so plainly.
"""


def _build_system_prompt(context: dict | None) -> str:
    if not context:
        return BASE_PROMPT
    title = (context.get("title") or "").strip()
    source = (context.get("source") or "").strip()
    summary = (context.get("summary") or "").strip()
    concepts = (context.get("concepts") or "").strip()
    parts = [BASE_PROMPT, "\nStudy guide context (use it to ground your answers):"]
    if title:
        parts.append(f"- Title: {title}")
    if source:
        parts.append(f"- Source: {source}")
    if summary:
        parts.append(f"- Summary: {summary}")
    if concepts:
        parts.append(f"- Key concepts: {concepts}")
    parts.append(
        "\nSpeak as a working expert in the field this guide belongs to. Stay on topic; "
        "if asked about something far outside the guide, answer briefly and steer back."
    )
    return "\n".join(parts)


async def chat(
    messages: list[dict[str, str]],
    context: dict | None = None,
) -> str:
    """Call Gemini with the Sage persona and return a reply string.

    `messages` is a list of {role: 'user'|'assistant', content: str} dicts in
    chronological order, ending with the latest user message.
    `context` optionally carries study-guide grounding (title/source/summary/concepts).
    """
    contents: list[types.Content] = []
    for msg in messages:
        role = msg.get("role", "user")
        text = (msg.get("content") or "").strip()
        if not text:
            continue
        gemini_role = "user" if role == "user" else "model"
        contents.append(types.Content(role=gemini_role, parts=[types.Part.from_text(text=text)]))

    if not contents:
        return ""

    system_prompt = _build_system_prompt(context)
    client = genai.Client(api_key=get_settings().gemini_api_key)
    try:
        async with client.aio as aio:
            response = await aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.4,
                    max_output_tokens=256,
                ),
            )
    except errors.APIError as exc:
        if exc.status == 429:
            raise GeminiRateLimit(_retry_after(exc)) from exc
        raise

    return (response.text or "").strip()
