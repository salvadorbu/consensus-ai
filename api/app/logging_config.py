"""Centralized logging configuration for the Consensus AI backend.

Calling `setup_logging()` will configure the root Python logger so that
messages coming from any module that uses `logging.getLogger(__name__)`
are emitted to stdout. Uvicorn/Starlette loggers will continue to work
with their default handlers; the root handler simply ensures our own
library logs are visible when the application runs under Uvicorn.
"""
from __future__ import annotations

import logging
import sys
from typing import Literal


LogLevel = Literal["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"]


def setup_logging(level: LogLevel | str = "INFO") -> None:
    """Configure the root logger if it has not been configured yet.

    Parameters
    ----------
    level: str, optional
        The minimum severity level that will be emitted. Defaults to
        ``"INFO"``. Accepts the standard logging level names (case
        insensitive).
    """

    # Avoid re-configuring if another part of the application (e.g.
    # Uvicorn autoreload) has already configured the root logger.
    if logging.getLogger().handlers:
        return

    numeric_level = getattr(logging, str(level).upper(), logging.INFO)

    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
