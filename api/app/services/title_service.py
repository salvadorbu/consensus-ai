from __future__ import annotations

"""Helpers for generating a concise chat title using a cheap LLM.

The title is generated only once per chat (when the first user message is
stored).  If the LLM call fails for any reason we gracefully fall back to a
simple heuristic so that the request handler never breaks.
"""

import asyncio
from app.agent import Agent

# NOTE: Pick an inexpensive model on OpenRouter.  Adjust as needed.
_DEFAULT_MODEL = "mistralai/mistral-7b-instruct:free"
# System instruction keeping the output extremely short (≤6 words, no quotes)
_PROMPT_PREFIX = (
    "You are a helpful assistant that creates concise chat titles. "
    "Return a short title (max-6-words) describing the user message. "
    "Do NOT wrap it in quotes.\n\nUser message: "
)

async def make_title(user_msg: str) -> str:
    """Return a short, human-readable title for *user_msg*.

    This coroutine never raises – it always returns a valid string so that the
    caller can safely persist it in the database.
    """
    user_msg = (user_msg or "").strip()
    # Fallback when the user somehow sent an empty payload
    if not user_msg:
        return "New Conversation"

    # --- 1) Attempt LLM generation ----------------------------------------
    try:
        # Offload to a thread to avoid blocking the event loop – the OpenAI
        # client is synchronous.
        def _call_llm() -> str | None:
            agent = Agent(_DEFAULT_MODEL)
            return agent.chat([
                {"role": "user", "content": _PROMPT_PREFIX + user_msg}
            ])
        raw: str | None = await asyncio.to_thread(_call_llm)
        if raw:
            # Clean & truncate – at most 6 words, 120 chars (DB limit)
            cleaned = " ".join(raw.strip().strip('"\'').split()[:6])
            if cleaned:
                return cleaned[:120]
    except Exception:  # pylint: disable=broad-except
        # Any failure falls through to heuristic
        pass

    # --- 2) Heuristic fallback: first line/40 chars -----------------------
    first_line = user_msg.splitlines()[0][:40].strip()
    return first_line or "New Conversation" 