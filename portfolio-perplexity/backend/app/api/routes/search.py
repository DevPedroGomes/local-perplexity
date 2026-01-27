from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json

from app.core.schemas import SearchRequest, SearchResponse, HealthResponse
from app.services.session_manager import session_manager
from app.services.research_agent import create_research_agent
from datetime import datetime

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API health and session capacity."""
    active_sessions = await session_manager.get_active_session_count()
    return HealthResponse(
        status="healthy",
        active_sessions=active_sessions,
        max_sessions=session_manager._max_sessions
    )


@router.get("/limits")
async def get_limits():
    """Get rate limit configuration."""
    return await session_manager.get_limits()


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Execute a research search.

    Rate limits:
    - Max 5 searches per session
    - Min 10 seconds between searches
    """
    # Get or create session
    session_id = await session_manager.get_or_create_session(request.session_id)

    if not session_id:
        raise HTTPException(
            status_code=503,
            detail="Maximum concurrent sessions reached. Please try again later."
        )

    # Check rate limit before proceeding
    can_search, error_message, wait_seconds = await session_manager.check_rate_limit(session_id)

    if not can_search:
        raise HTTPException(
            status_code=429,
            detail={
                "message": error_message,
                "wait_seconds": wait_seconds,
                "session_id": session_id
            }
        )

    # Record search BEFORE executing (prevents race conditions)
    await session_manager.record_search(session_id)

    # Create research agent and execute search
    agent = create_research_agent()

    try:
        result = agent.search(request.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    # Add to history
    await session_manager.add_to_history(session_id, request.query, result["response"])

    # Get updated session info
    session_info = await session_manager.get_session_info(session_id)

    return SearchResponse(
        session_id=session_id,
        query=request.query,
        response=result["response"],
        sources=result["sources"],
        created_at=datetime.utcnow(),
        remaining_searches=session_info.get("remaining_searches", 0) if session_info else 0
    )


@router.post("/search/stream")
async def search_stream(request: SearchRequest):
    """
    Execute a research search with streaming updates.

    Rate limits:
    - Max 5 searches per session
    - Min 10 seconds between searches
    """
    # Get or create session
    session_id = await session_manager.get_or_create_session(request.session_id)

    if not session_id:
        raise HTTPException(
            status_code=503,
            detail="Maximum concurrent sessions reached. Please try again later."
        )

    # Check rate limit before proceeding
    can_search, error_message, wait_seconds = await session_manager.check_rate_limit(session_id)

    if not can_search:
        raise HTTPException(
            status_code=429,
            detail={
                "message": error_message,
                "wait_seconds": wait_seconds,
                "session_id": session_id
            }
        )

    # Record search BEFORE executing
    await session_manager.record_search(session_id)

    agent = create_research_agent()

    async def event_generator():
        # Get session info for limits
        session_info = await session_manager.get_session_info(session_id)
        remaining = session_info.get("remaining_searches", 0) if session_info else 0

        # Send session ID and limits first
        yield f"data: {json.dumps({'event': 'session', 'data': {'session_id': session_id, 'remaining_searches': remaining}})}\n\n"

        try:
            async for event in agent.search_stream(request.query):
                yield f"data: {json.dumps(event)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'event': 'error', 'data': {'message': str(e)}})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get session information including rate limit status."""
    session_info = await session_manager.get_session_info(session_id)

    if not session_info:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    return session_info


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    deleted = await session_manager.delete_session(session_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Session deleted successfully"}
