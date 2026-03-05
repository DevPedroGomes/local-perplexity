"""
Research Agent with Chain-of-Thought, Grounded Generation, and Self-Reflection.

This agent implements advanced RAG techniques:
1. Chain-of-Thought: Step-by-step reasoning for query generation
2. Grounded Generation: Only includes claims supported by sources
3. Self-Reflection: Evaluates and improves response quality before returning
4. Multi-provider LLM: Groq (fastest, free tier) with DeepSeek fallback
5. Enhanced Search: Multiple results per query for better coverage
"""

import logging
from typing import List, AsyncGenerator, Generator, Literal, Optional

from pydantic import BaseModel
from tavily import TavilyClient
from langchain_groq import ChatGroq
from langchain_deepseek import ChatDeepSeek
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, START, END

from app.core.config import settings
from app.core.schemas import QueryResult, ReportState, ReflectionResult
from app.core.prompts import (
    SYSTEM_PROMPT,
    QUERY_GENERATION_PROMPT,
    GROUNDED_SYNTHESIS_PROMPT,
    SELF_REFLECTION_PROMPT,
    IMPROVE_RESPONSE_PROMPT,
)


logger = logging.getLogger(__name__)

MAX_REFLECTION_ITERATIONS = 1  # Only 1 retry to keep costs down


class LLMProvider:
    """
    Multi-provider LLM wrapper with automatic fallback.

    Primary: Groq (fastest inference, free tier with generous limits)
    Fallback: DeepSeek (cheapest option at $0.07/M tokens)

    The provider automatically switches to fallback on errors and attempts
    to return to primary after successful fallback calls.
    """

    def __init__(self):
        self._primary: Optional[BaseChatModel] = None
        self._fallback: Optional[BaseChatModel] = None
        self._using_fallback = False
        self._fallback_call_count = 0
        self._retry_primary_after = 5
        self._init_providers()

    def _init_providers(self):
        """Initialize LLM providers based on available API keys."""
        if settings.GROQ_API_KEY:
            try:
                self._primary = ChatGroq(
                    model=settings.GROQ_MODEL,
                    api_key=settings.GROQ_API_KEY,
                    temperature=0.1,
                    timeout=30,
                )
                logger.info(f"Initialized Groq with model: {settings.GROQ_MODEL}")
            except Exception as e:
                logger.warning(f"Failed to initialize Groq: {e}")

        if settings.DEEPSEEK_API_KEY:
            try:
                self._fallback = ChatDeepSeek(
                    model=settings.DEEPSEEK_MODEL,
                    api_key=settings.DEEPSEEK_API_KEY,
                    temperature=0.1,
                    timeout=30,
                )
                logger.info(f"Initialized DeepSeek fallback with model: {settings.DEEPSEEK_MODEL}")
            except Exception as e:
                logger.warning(f"Failed to initialize DeepSeek: {e}")

        if not self._primary and not self._fallback:
            raise ValueError("No LLM provider configured. Set GROQ_API_KEY or DEEPSEEK_API_KEY.")

    @property
    def llm(self) -> BaseChatModel:
        """Get the active LLM (primary or fallback)."""
        if self._using_fallback and self._fallback:
            return self._fallback
        if self._primary:
            return self._primary
        if self._fallback:
            return self._fallback
        raise ValueError("No LLM available")

    def _build_messages(self, prompt: str) -> list:
        """Build chat messages with system prompt."""
        return [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]

    def _try_recover_primary(self, messages: list) -> Optional[object]:
        """Try to return to primary LLM after fallback period. Returns result or None."""
        if not (self._using_fallback and self._primary and self._fallback_call_count >= self._retry_primary_after):
            return None
        try:
            logger.info("Attempting to return to primary LLM...")
            result = self._primary.invoke(messages)
            logger.info("Successfully returned to primary LLM")
            self._using_fallback = False
            self._fallback_call_count = 0
            return result
        except Exception as e:
            logger.warning(f"Primary LLM still failing ({e}), continuing with fallback")
            self._fallback_call_count = 0
            return None

    def invoke(self, prompt: str):
        """Invoke LLM with system prompt and automatic fallback."""
        messages = self._build_messages(prompt)

        recovery = self._try_recover_primary(messages)
        if recovery is not None:
            return recovery

        try:
            result = self.llm.invoke(messages)
            if self._using_fallback:
                self._fallback_call_count += 1
            return result
        except Exception as e:
            if not self._using_fallback and self._fallback:
                logger.warning(f"Primary LLM failed ({e}), switching to fallback")
                self._using_fallback = True
                self._fallback_call_count = 1
                return self._fallback.invoke(messages)
            raise

    def invoke_structured(self, prompt: str, schema):
        """Invoke LLM with structured output and automatic fallback."""
        messages = self._build_messages(prompt)

        # Try recovery to primary if in fallback mode
        if self._using_fallback and self._primary and self._fallback_call_count >= self._retry_primary_after:
            try:
                logger.info("Attempting to return to primary LLM (structured)...")
                result = self._primary.with_structured_output(schema).invoke(messages)
                logger.info("Successfully returned to primary LLM")
                self._using_fallback = False
                self._fallback_call_count = 0
                return result
            except Exception as e:
                logger.warning(f"Primary LLM still failing ({e}), continuing with fallback")
                self._fallback_call_count = 0

        try:
            result = self.llm.with_structured_output(schema).invoke(messages)
            if self._using_fallback:
                self._fallback_call_count += 1
            return result
        except Exception as e:
            if not self._using_fallback and self._fallback:
                logger.warning(f"Primary LLM failed ({e}) on structured output, switching to fallback")
                self._using_fallback = True
                self._fallback_call_count = 1
                return self._fallback.with_structured_output(schema).invoke(messages)
            raise

    def stream(self, prompt: str) -> Generator:
        """Stream LLM response with automatic fallback."""
        messages = self._build_messages(prompt)

        try:
            for chunk in self.llm.stream(messages):
                yield chunk
            if self._using_fallback:
                self._fallback_call_count += 1
        except Exception as e:
            if not self._using_fallback and self._fallback:
                logger.warning(f"Primary LLM failed ({e}) during stream, switching to fallback")
                self._using_fallback = True
                self._fallback_call_count = 1
                for chunk in self._fallback.stream(messages):
                    yield chunk
            else:
                raise

    def get_provider_name(self) -> str:
        """Get the name of the active provider."""
        if self._using_fallback:
            return "DeepSeek"
        if self._primary:
            return "Groq"
        return "DeepSeek"


class ResearchAgent:
    """
    LangGraph-based research agent with self-reflection capabilities.

    Features:
    - Multi-provider LLM with automatic fallback
    - Enhanced search with multiple results per query
    - Chain-of-Thought query generation
    - Grounded generation with source verification
    - Self-reflection loop for quality assurance
    """

    def __init__(self):
        self.llm_provider = LLMProvider()
        self.tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        self.max_results_per_query = settings.TAVILY_MAX_RESULTS
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """
        Build the LangGraph workflow with self-reflection loop.

        Flow:
        START -> build_queries -> search_all -> grounded_writer -> self_reflect
                                                                      |
                                                     +----------------+----------------+
                                                     |                                 |
                                                   PASS                         NEEDS_IMPROVEMENT
                                                     |                                 |
                                                     v                                 v
                                                  finalize                      improve_response
                                                     |                                 |
                                                     v                                 v
                                                    END <-----------------------------+
        """
        builder = StateGraph(ReportState)

        builder.add_node("build_queries", self._build_queries)
        builder.add_node("search_all", self._search_all)
        builder.add_node("grounded_writer", self._grounded_writer)
        builder.add_node("self_reflect", self._self_reflect)
        builder.add_node("improve_response", self._improve_response)
        builder.add_node("finalize", self._finalize)

        builder.add_edge(START, "build_queries")
        builder.add_edge("build_queries", "search_all")
        builder.add_edge("search_all", "grounded_writer")
        builder.add_edge("grounded_writer", "self_reflect")

        builder.add_conditional_edges(
            "self_reflect",
            self._should_improve,
            {
                "improve": "improve_response",
                "accept": "finalize"
            }
        )

        builder.add_edge("improve_response", "finalize")
        builder.add_edge("finalize", END)

        return builder.compile()

    def _build_queries(self, state: ReportState) -> dict:
        """Generate search queries using Chain-of-Thought reasoning."""
        class QueryList(BaseModel):
            queries: List[str]

        prompt = QUERY_GENERATION_PROMPT.format(user_input=state.user_input)
        result = self.llm_provider.invoke_structured(prompt, QueryList)

        return {"queries": result.queries}

    def _search_all(self, state: ReportState) -> dict:
        """Execute all searches and collect multiple results per query."""
        all_results = []
        seen_urls = set()

        for query in state.queries:
            results = self._execute_search(query, seen_urls)
            all_results.extend(results)

        return {"queries_results": all_results}

    def _execute_search(self, query: str, seen_urls: set) -> List[QueryResult]:
        """Execute a search and return multiple results."""
        results_list = []

        try:
            search_results = self.tavily_client.search(
                query,
                max_results=self.max_results_per_query,
                include_raw_content=False,
            )

            if not search_results.get("results"):
                return results_list

            for result in search_results["results"]:
                url = result.get("url", "")

                if url in seen_urls:
                    continue
                seen_urls.add(url)

                title = result.get("title", "Untitled")
                content = result.get("content", "")

                results_list.append(QueryResult(
                    title=title,
                    url=url,
                    resume=content if content else "No content available",
                ))

        except Exception as e:
            logger.error(f"Search error for query '{query}': {e}")

        return results_list

    def _grounded_writer(self, state: ReportState) -> dict:
        """Generate initial response using Grounded Generation."""
        search_results = self._format_sources(state.queries_results)

        prompt = GROUNDED_SYNTHESIS_PROMPT.format(
            user_input=state.user_input,
            search_results=search_results
        )

        llm_result = self.llm_provider.invoke(prompt)

        return {
            "draft_response": llm_result.content,
            "iteration_count": 0
        }

    def _self_reflect(self, state: ReportState) -> dict:
        """Evaluate the draft response for quality and accuracy."""
        sources_summary = self._format_sources(state.queries_results)

        prompt = SELF_REFLECTION_PROMPT.format(
            user_input=state.user_input,
            sources_summary=sources_summary,
            draft_response=state.draft_response
        )

        result = self.llm_provider.invoke_structured(prompt, ReflectionResult)

        return {
            "reflection_verdict": result.verdict,
            "reflection_issues": result.issues,
            "iteration_count": state.iteration_count + 1
        }

    def _should_improve(self, state: ReportState) -> Literal["improve", "accept"]:
        """Decide whether to improve or accept the response."""
        if state.reflection_verdict == "NEEDS_IMPROVEMENT" and state.iteration_count <= MAX_REFLECTION_ITERATIONS:
            return "improve"
        return "accept"

    def _improve_response(self, state: ReportState) -> dict:
        """Improve the response based on reflection feedback."""
        search_results = self._format_sources(state.queries_results)

        prompt = IMPROVE_RESPONSE_PROMPT.format(
            user_input=state.user_input,
            search_results=search_results,
            draft_response=state.draft_response,
            issues=state.reflection_issues
        )

        llm_result = self.llm_provider.invoke(prompt)

        return {"draft_response": llm_result.content}

    def _finalize(self, state: ReportState) -> dict:
        """Finalize the response with references."""
        references = self._format_references(state.queries_results)
        final_response = state.draft_response + "\n\n**References:**\n" + references

        return {"final_response": final_response}

    def _format_sources(self, results: List[QueryResult]) -> str:
        """Format sources for prompts."""
        formatted = ""
        for i, result in enumerate(results):
            formatted += f"[{i + 1}] {result.title}\n"
            formatted += f"URL: {result.url}\n"
            formatted += f"Content: {result.resume}\n"
            formatted += "---\n\n"
        return formatted

    def _format_references(self, results: List[QueryResult]) -> str:
        """Format references for final output."""
        return "\n".join([
            f"[{i + 1}] [{r.title}]({r.url})"
            for i, r in enumerate(results)
        ])

    def search(self, query: str) -> dict:
        """Execute a search synchronously."""
        result = self.graph.invoke({"user_input": query})
        return {
            "response": result.get("final_response", ""),
            "sources": result.get("queries_results", []),
            "queries": result.get("queries", []),
            "provider": self.llm_provider.get_provider_name()
        }

    async def search_stream(self, query: str) -> AsyncGenerator[dict, None]:
        """Execute a search with streaming updates including token-by-token response."""
        yield {
            "event": "status",
            "data": {
                "message": f"Starting research (using {self.llm_provider.get_provider_name()})...",
                "step": "init",
                "provider": self.llm_provider.get_provider_name()
            }
        }

        # Build queries with CoT
        yield {"event": "status", "data": {"message": "Planning search strategy...", "step": "queries"}}

        state = ReportState(user_input=query)

        try:
            queries_result = self._build_queries(state)
        except Exception as e:
            yield {"event": "error", "data": {"message": f"Failed to generate queries: {str(e)}"}}
            return

        queries = queries_result["queries"]

        yield {
            "event": "queries",
            "data": {"queries": queries, "count": len(queries)}
        }

        # Search each query
        all_results = []
        seen_urls = set()

        for i, q in enumerate(queries):
            yield {
                "event": "status",
                "data": {
                    "message": f"Searching: {q[:50]}...",
                    "step": "search",
                    "current": i + 1,
                    "total": len(queries)
                }
            }

            results = self._execute_search(q, seen_urls)
            for result in results:
                all_results.append(result)
                yield {
                    "event": "source",
                    "data": {
                        "title": result.title,
                        "url": result.url,
                        "resume": result.resume[:300] + "..." if len(result.resume) > 300 else result.resume
                    }
                }

        if not all_results:
            yield {"event": "error", "data": {"message": "No search results found. Please try a different query."}}
            return

        # Grounded synthesis — stream tokens
        yield {"event": "status", "data": {"message": "Synthesizing with source verification...", "step": "synthesis"}}

        search_results_text = self._format_sources(all_results)
        synthesis_prompt = GROUNDED_SYNTHESIS_PROMPT.format(
            user_input=query,
            search_results=search_results_text
        )

        try:
            draft_text = ""
            for chunk in self.llm_provider.stream(synthesis_prompt):
                token = chunk.content if hasattr(chunk, 'content') else str(chunk)
                if token:
                    draft_text += token
                    yield {"event": "content", "data": {"token": token}}
        except Exception as e:
            yield {"event": "error", "data": {"message": f"Synthesis failed: {str(e)}"}}
            return

        state = ReportState(
            user_input=query,
            queries=queries,
            queries_results=all_results,
            draft_response=draft_text,
            iteration_count=0,
        )

        # Self-reflection
        yield {"event": "status", "data": {"message": "Evaluating response quality...", "step": "reflection"}}

        try:
            reflect_result = self._self_reflect(state)
        except Exception as e:
            logger.warning(f"Self-reflection failed: {e}, using draft response")
            reflect_result = {"reflection_verdict": "PASS", "reflection_issues": "None", "iteration_count": 1}

        state.reflection_verdict = reflect_result["reflection_verdict"]
        state.reflection_issues = reflect_result["reflection_issues"]
        state.iteration_count = reflect_result["iteration_count"]

        # Improve if needed — stream the rewrite
        if state.reflection_verdict == "NEEDS_IMPROVEMENT" and state.iteration_count <= MAX_REFLECTION_ITERATIONS:
            yield {"event": "status", "data": {"message": "Improving response...", "step": "improvement"}}

            # Signal frontend to clear previous content
            yield {"event": "content", "data": {"token": "", "replace": True}}

            try:
                improve_prompt = IMPROVE_RESPONSE_PROMPT.format(
                    user_input=state.user_input,
                    search_results=search_results_text,
                    draft_response=state.draft_response,
                    issues=state.reflection_issues
                )

                improved_text = ""
                for chunk in self.llm_provider.stream(improve_prompt):
                    token = chunk.content if hasattr(chunk, 'content') else str(chunk)
                    if token:
                        improved_text += token
                        yield {"event": "content", "data": {"token": token}}

                state.draft_response = improved_text

            except Exception as e:
                logger.warning(f"Improvement failed: {e}, using original draft")

        # Finalize — append references
        references = self._format_references(state.queries_results)
        references_text = "\n\n**References:**\n" + references

        yield {"event": "content", "data": {"token": references_text, "done": True}}

        yield {
            "event": "done",
            "data": {
                "sources_count": len(all_results),
                "queries_count": len(queries),
                "reflection_verdict": state.reflection_verdict,
                "provider": self.llm_provider.get_provider_name()
            }
        }


# Singleton instance — reused across requests
_agent_instance: Optional[ResearchAgent] = None


def create_research_agent() -> ResearchAgent:
    """Get or create the singleton research agent."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = ResearchAgent()
    return _agent_instance
