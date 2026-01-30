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
from pydantic import BaseModel
from typing import List, AsyncGenerator, Literal, Optional
from tavily import TavilyClient
from langchain_groq import ChatGroq
from langchain_deepseek import ChatDeepSeek
from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.graph import StateGraph, START, END

from app.core.config import settings
from app.core.schemas import QueryResult, ReportState
from app.core.prompts import (
    QUERY_GENERATION_PROMPT,
    SUMMARIZE_SOURCE_PROMPT,
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
        self._retry_primary_after = 5  # Try primary again after N successful fallback calls
        self._init_providers()

    def _init_providers(self):
        """Initialize LLM providers based on available API keys."""
        # Primary: Groq (fastest, free tier)
        if settings.GROQ_API_KEY:
            try:
                self._primary = ChatGroq(
                    model=settings.GROQ_MODEL,
                    api_key=settings.GROQ_API_KEY,
                    temperature=0.1,
                )
                logger.info(f"Initialized Groq with model: {settings.GROQ_MODEL}")
            except Exception as e:
                logger.warning(f"Failed to initialize Groq: {e}")

        # Fallback: DeepSeek
        if settings.DEEPSEEK_API_KEY:
            try:
                self._fallback = ChatDeepSeek(
                    model=settings.DEEPSEEK_MODEL,
                    api_key=settings.DEEPSEEK_API_KEY,
                    temperature=0.1,
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

    def invoke(self, prompt: str):
        """Invoke LLM with automatic fallback on error and recovery."""
        # If using fallback, periodically try to return to primary
        if self._using_fallback and self._primary and self._fallback_call_count >= self._retry_primary_after:
            try:
                logger.info("Attempting to return to primary LLM...")
                result = self._primary.invoke(prompt)
                logger.info("Successfully returned to primary LLM")
                self._using_fallback = False
                self._fallback_call_count = 0
                return result
            except Exception as e:
                logger.warning(f"Primary LLM still failing ({e}), continuing with fallback")
                self._fallback_call_count = 0  # Reset counter to try again later

        try:
            result = self.llm.invoke(prompt)
            if self._using_fallback:
                self._fallback_call_count += 1
            return result
        except Exception as e:
            if not self._using_fallback and self._fallback:
                logger.warning(f"Primary LLM failed ({e}), switching to fallback")
                self._using_fallback = True
                self._fallback_call_count = 1
                return self._fallback.invoke(prompt)
            raise

    def with_structured_output(self, schema):
        """Get LLM with structured output capability."""
        return self.llm.with_structured_output(schema)

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

        # Add nodes
        builder.add_node("build_queries", self._build_queries)
        builder.add_node("search_all", self._search_all)
        builder.add_node("grounded_writer", self._grounded_writer)
        builder.add_node("self_reflect", self._self_reflect)
        builder.add_node("improve_response", self._improve_response)
        builder.add_node("finalize", self._finalize)

        # Add edges
        builder.add_edge(START, "build_queries")
        builder.add_edge("build_queries", "search_all")
        builder.add_edge("search_all", "grounded_writer")
        builder.add_edge("grounded_writer", "self_reflect")

        # Conditional edge based on reflection result
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
        query_llm = self.llm_provider.with_structured_output(QueryList)
        result = query_llm.invoke(prompt)

        return {"queries": result.queries}

    def _search_all(self, state: ReportState) -> dict:
        """Execute all searches and collect multiple results per query."""
        all_results = []
        seen_urls = set()  # Avoid duplicate sources

        for query in state.queries:
            results = self._execute_search(query, state.user_input, seen_urls)
            all_results.extend(results)

        return {"queries_results": all_results}

    def _execute_search(self, query: str, original_question: str, seen_urls: set) -> List[QueryResult]:
        """Execute a search and return multiple results."""
        results_list = []

        try:
            # Get multiple results per query
            search_results = self.tavily_client.search(
                query,
                max_results=self.max_results_per_query,
                include_raw_content=True  # Get content directly when available
            )

            if not search_results.get("results"):
                return results_list

            for result in search_results["results"]:
                url = result.get("url", "")

                # Skip duplicates
                if url in seen_urls:
                    continue
                seen_urls.add(url)

                title = result.get("title", "Untitled")
                content = result.get("content", "")
                raw_content = result.get("raw_content", "")

                # Use raw_content if available, otherwise use snippet
                if raw_content and len(raw_content) > len(content):
                    # Summarize long content
                    if len(raw_content) > 2000:
                        try:
                            prompt = SUMMARIZE_SOURCE_PROMPT.format(
                                user_input=original_question,
                                web_search_results=raw_content[:8000]  # Limit context
                            )
                            llm_result = self.llm_provider.invoke(prompt)
                            resume = llm_result.content
                        except Exception:
                            resume = raw_content[:1500] + "..."
                    else:
                        resume = raw_content
                else:
                    resume = content if content else "No content available"

                results_list.append(QueryResult(title=title, url=url, resume=resume))

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

        llm_result = self.llm_provider.invoke(prompt)
        reflection = llm_result.content

        # Parse reflection result
        verdict = "PASS"
        issues = "None"

        if "VERDICT:" in reflection:
            verdict_line = [l for l in reflection.split("\n") if "VERDICT:" in l]
            if verdict_line:
                verdict = "NEEDS_IMPROVEMENT" if "NEEDS_IMPROVEMENT" in verdict_line[0] else "PASS"

        if "ISSUES:" in reflection:
            issues_start = reflection.find("ISSUES:")
            issues = reflection[issues_start + 7:].strip()

        return {
            "reflection_verdict": verdict,
            "reflection_issues": issues,
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
        """Execute a search with streaming updates."""
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

            results = self._execute_search(q, query, seen_urls)
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

        # Grounded synthesis
        yield {"event": "status", "data": {"message": "Synthesizing with source verification...", "step": "synthesis"}}

        state = ReportState(
            user_input=query,
            queries=queries,
            queries_results=all_results
        )

        try:
            draft_result = self._grounded_writer(state)
        except Exception as e:
            yield {"event": "error", "data": {"message": f"Synthesis failed: {str(e)}"}}
            return

        state.draft_response = draft_result["draft_response"]
        state.iteration_count = draft_result["iteration_count"]

        # Self-reflection
        yield {"event": "status", "data": {"message": "Evaluating response quality...", "step": "reflection"}}

        try:
            reflect_result = self._self_reflect(state)
        except Exception as e:
            # If reflection fails, skip it and use draft response
            logger.warning(f"Self-reflection failed: {e}, using draft response")
            reflect_result = {"reflection_verdict": "PASS", "reflection_issues": "None", "iteration_count": 1}

        state.reflection_verdict = reflect_result["reflection_verdict"]
        state.reflection_issues = reflect_result["reflection_issues"]
        state.iteration_count = reflect_result["iteration_count"]

        # Improve if needed
        if state.reflection_verdict == "NEEDS_IMPROVEMENT" and state.iteration_count <= MAX_REFLECTION_ITERATIONS:
            yield {"event": "status", "data": {"message": "Improving response...", "step": "improvement"}}
            try:
                improve_result = self._improve_response(state)
                state.draft_response = improve_result["draft_response"]
            except Exception as e:
                logger.warning(f"Improvement failed: {e}, using original draft")

        # Finalize
        final_result = self._finalize(state)

        yield {
            "event": "content",
            "data": {"response": final_result["final_response"]}
        }

        yield {
            "event": "done",
            "data": {
                "sources_count": len(all_results),
                "queries_count": len(queries),
                "reflection_verdict": state.reflection_verdict,
                "provider": self.llm_provider.get_provider_name()
            }
        }


def create_research_agent() -> ResearchAgent:
    """Factory function for creating agents."""
    return ResearchAgent()
