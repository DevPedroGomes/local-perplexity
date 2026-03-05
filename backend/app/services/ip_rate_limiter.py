"""
IP-based rate limiter to prevent session bypass abuse.

The session-based rate limit (SessionManager) can be bypassed by clearing
localStorage or opening incognito tabs. This middleware adds a hard limit
per IP address that cannot be circumvented from the client side.
"""

import time
import asyncio
import logging
from dataclasses import dataclass, field
from typing import Dict, Tuple, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class IPRecord:
    """Tracks usage for a single IP address."""
    first_request_at: float
    request_count: int = 0
    searches_in_window: int = 0
    last_search_at: float = 0.0


class IPRateLimiter:
    """
    Rate limiter by IP address — cannot be bypassed from the client.

    Limits:
    - Max searches per IP per time window (default: 15 searches / 60 min)
    - Min seconds between searches from same IP (default: 8 seconds)
    - Auto-cleanup of stale records every 100 checks
    """

    def __init__(self):
        self._records: Dict[str, IPRecord] = {}
        self._lock = asyncio.Lock()
        self._check_count = 0

        # Config from settings
        self._max_searches_per_window = settings.IP_MAX_SEARCHES_PER_WINDOW
        self._window_seconds = settings.IP_WINDOW_SECONDS
        self._min_seconds_between = settings.IP_MIN_SECONDS_BETWEEN_SEARCHES

    async def check_ip(self, ip: str) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Check if an IP can make a search.

        Returns:
            (allowed, error_message, wait_seconds)
        """
        async with self._lock:
            self._check_count += 1
            if self._check_count % 100 == 0:
                self._cleanup_stale()

            now = time.time()
            record = self._records.get(ip)

            if not record:
                self._records[ip] = IPRecord(first_request_at=now)
                return True, None, None

            # Reset window if expired
            if now - record.first_request_at > self._window_seconds:
                record.first_request_at = now
                record.searches_in_window = 0

            # Check window quota
            if record.searches_in_window >= self._max_searches_per_window:
                remaining = int(self._window_seconds - (now - record.first_request_at)) + 1
                return (
                    False,
                    f"IP rate limit exceeded. Max {self._max_searches_per_window} searches per hour.",
                    remaining,
                )

            # Check cooldown between searches
            if record.last_search_at:
                elapsed = now - record.last_search_at
                if elapsed < self._min_seconds_between:
                    wait = int(self._min_seconds_between - elapsed) + 1
                    return False, f"Please wait {wait} seconds.", wait

            return True, None, None

    async def record_search(self, ip: str) -> None:
        """Record a search for the given IP."""
        async with self._lock:
            now = time.time()
            record = self._records.get(ip)
            if record:
                record.searches_in_window += 1
                record.last_search_at = now
            else:
                self._records[ip] = IPRecord(
                    first_request_at=now,
                    searches_in_window=1,
                    last_search_at=now,
                )

    def _cleanup_stale(self) -> None:
        """Remove IP records older than 2x the window (called inside lock)."""
        now = time.time()
        cutoff = now - (self._window_seconds * 2)
        stale = [ip for ip, r in self._records.items() if r.first_request_at < cutoff]
        for ip in stale:
            del self._records[ip]
        if stale:
            logger.debug(f"Cleaned {len(stale)} stale IP records")


# Singleton
ip_rate_limiter = IPRateLimiter()
