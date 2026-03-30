from pydantic import BaseModel, Field
from typing import List, Literal, Optional
import operator
from typing_extensions import Annotated
from datetime import datetime


class QueryResult(BaseModel):
    """Individual search result with extracted content."""
    title: str = ""
    url: str = ""
    resume: str = ""
    published_date: Optional[str] = None


class ReflectionResult(BaseModel):
    """Result of self-reflection evaluation."""
    verdict: Literal["PASS", "NEEDS_IMPROVEMENT"]
    issues: str = "None"


class ReportState(BaseModel):
    """State for the LangGraph research workflow."""
    user_input: str = ""
    queries: List[str] = []
    queries_results: Annotated[List[QueryResult], operator.add] = []
    draft_response: str = ""  # Initial synthesis
    reflection_verdict: str = ""  # PASS or NEEDS_IMPROVEMENT
    reflection_issues: str = ""  # Issues found during reflection
    final_response: str = ""
    iteration_count: int = 0  # Track reflection iterations


# API Request/Response Models
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="User search query")
    session_id: Optional[str] = Field(default=None, description="Session ID for tracking")


class SearchResponse(BaseModel):
    session_id: str
    query: str
    response: str
    sources: List[QueryResult]
    created_at: datetime
    remaining_searches: int = 0


class SessionInfo(BaseModel):
    session_id: str
    created_at: datetime
    last_activity: datetime
    search_count: int


class HealthResponse(BaseModel):
    status: str
    active_sessions: int
    max_sessions: int


class StreamEvent(BaseModel):
    event: str  # "status", "source", "content", "done", "error"
    data: dict
