from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import uuid
import asyncio
from dataclasses import dataclass, field
from enum import Enum
from app.core.config import settings


@dataclass
class Session:
    session_id: str
    created_at: datetime
    last_activity: datetime
    creator_ip: str = ""
    last_search_at: Optional[datetime] = None
    search_count: int = 0
    search_history: list = field(default_factory=list)


class SessionManager:
    """
    Manages user sessions with rate limiting and quota controls.

    Limits:
    - Max 35 concurrent sessions
    - Max 5 searches per session (quota)
    - Min 10 seconds between searches (rate limit)
    - Session expires after 30 minutes of inactivity
    """

    def __init__(self):
        self._sessions: Dict[str, Session] = {}
        self._lock = asyncio.Lock()
        self._max_sessions = settings.MAX_CONCURRENT_SESSIONS
        self._timeout_minutes = settings.SESSION_TIMEOUT_MINUTES
        self._max_searches_per_session = settings.MAX_SEARCHES_PER_SESSION
        self._min_seconds_between_searches = settings.MIN_SECONDS_BETWEEN_SEARCHES

    async def create_session(self, client_ip: str = "") -> Optional[str]:
        """Create a new session if capacity allows."""
        async with self._lock:
            await self._cleanup_expired_sessions()

            if len(self._sessions) >= self._max_sessions:
                return None

            session_id = str(uuid.uuid4())
            now = datetime.utcnow()
            self._sessions[session_id] = Session(
                session_id=session_id,
                created_at=now,
                last_activity=now,
                creator_ip=client_ip,
            )
            return session_id

    async def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID and update last activity."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if session:
                if self._is_expired(session):
                    del self._sessions[session_id]
                    return None
                session.last_activity = datetime.utcnow()
            return session

    async def get_or_create_session(self, session_id: Optional[str] = None, client_ip: str = "") -> Optional[str]:
        """Get existing session or create new one."""
        if session_id:
            session = await self.get_session(session_id)
            if session:
                return session_id

        return await self.create_session(client_ip=client_ip)

    async def validate_session_owner(self, session_id: str, client_ip: str) -> bool:
        """Validate that the requesting IP matches the session creator."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return False
            if not session.creator_ip:
                return False
            return session.creator_ip == client_ip

    async def check_rate_limit(self, session_id: str) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Check if session can make a search request.

        Returns:
            Tuple of (can_search, error_message, wait_seconds)
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return False, "Session not found", None

            # Check quota
            if session.search_count >= self._max_searches_per_session:
                return False, f"Search quota exceeded. Maximum {self._max_searches_per_session} searches per session.", None

            # Check rate limit
            if session.last_search_at:
                elapsed = (datetime.utcnow() - session.last_search_at).total_seconds()
                if elapsed < self._min_seconds_between_searches:
                    wait_seconds = int(self._min_seconds_between_searches - elapsed) + 1
                    return False, f"Please wait {wait_seconds} seconds before searching again.", wait_seconds

            return True, None, None

    async def record_search(self, session_id: str) -> None:
        """Record that a search was made (call before search starts)."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.search_count += 1
                session.last_search_at = datetime.utcnow()
                session.last_activity = datetime.utcnow()

    async def add_to_history(self, session_id: str, query: str, response: str) -> None:
        """Add search to session history."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.search_history.append({
                    "query": query,
                    "response": response[:500],
                    "timestamp": datetime.utcnow().isoformat()
                })
                session.search_history = session.search_history[-10:]

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        async with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                return True
            return False

    async def get_active_session_count(self) -> int:
        """Get count of active sessions."""
        async with self._lock:
            await self._cleanup_expired_sessions()
            return len(self._sessions)

    async def get_session_info(self, session_id: str) -> Optional[dict]:
        """Get session information including limits."""
        session = await self.get_session(session_id)
        if session:
            remaining_searches = max(0, self._max_searches_per_session - session.search_count)

            # Calculate cooldown
            cooldown_remaining = 0
            if session.last_search_at:
                elapsed = (datetime.utcnow() - session.last_search_at).total_seconds()
                if elapsed < self._min_seconds_between_searches:
                    cooldown_remaining = int(self._min_seconds_between_searches - elapsed)

            return {
                "session_id": session.session_id,
                "created_at": session.created_at,
                "last_activity": session.last_activity,
                "search_count": session.search_count,
                "remaining_searches": remaining_searches,
                "max_searches": self._max_searches_per_session,
                "cooldown_remaining": cooldown_remaining,
                "cooldown_seconds": self._min_seconds_between_searches
            }
        return None

    async def get_limits(self) -> dict:
        """Get current rate limit configuration."""
        return {
            "max_searches_per_session": self._max_searches_per_session,
            "min_seconds_between_searches": self._min_seconds_between_searches,
            "session_timeout_minutes": self._timeout_minutes,
            "max_concurrent_sessions": self._max_sessions
        }

    def _is_expired(self, session: Session) -> bool:
        """Check if session is expired."""
        expiry_time = session.last_activity + timedelta(minutes=self._timeout_minutes)
        return datetime.utcnow() > expiry_time

    async def _cleanup_expired_sessions(self) -> None:
        """Remove expired sessions (called within lock)."""
        expired = [
            sid for sid, session in self._sessions.items()
            if self._is_expired(session)
        ]
        for sid in expired:
            del self._sessions[sid]


# Singleton instance
session_manager = SessionManager()
