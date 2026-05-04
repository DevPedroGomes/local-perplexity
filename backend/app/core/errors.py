"""Shared error handling utilities."""

from app.core.config import settings


def sanitize_error_message(error: Exception) -> str:
    """Sanitize error messages to avoid leaking sensitive information in production."""
    if settings.ENV == "development":
        return str(error)
    # In production, return a generic message
    return "An internal error occurred. Please try again."
