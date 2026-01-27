"""
Research Agent with Chain-of-Thought, Grounded Generation, and Self-Reflection.

This agent implements three key improvements over basic RAG:
1. Chain-of-Thought: Step-by-step reasoning for query generation
2. Grounded Generation: Only includes claims supported by sources
3. Self-Reflection: Evaluates and improves response quality before returning
"""

from pydantic import BaseModel
from typing import List, AsyncGenerator, Literal
from tavily import TavilyClient
from langchain_groq import ChatGroq
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


MAX_REFLECTION_ITERATIONS = 1  # Only 1 retry to keep costs down


class ResearchAgent:
    """
    LangGraph-based research agent with self-reflection capabilities.
    """

    def __init__(self):
        self.llm = ChatGroq(
            model=settings.LLM_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=0.1,  # Low temperature for more consistent outputs
        )
        self.tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)
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
        query_llm = self.llm.with_structured_output(QueryList)
        result = query_llm.invoke(prompt)

        return {"queries": result.queries}

    def _search_all(self, state: ReportState) -> dict:
        """Execute all searches sequentially and collect results."""
        all_results = []

        for query in state.queries:
            result = self._execute_single_search(query, state.user_input)
            if result:
                all_results.append(result)

        return {"queries_results": all_results}

    def _execute_single_search(self, query: str, original_question: str) -> QueryResult | None:
        """Execute a single search and summarize the result."""
        try:
            results = self.tavily_client.search(query, max_results=1, include_raw_content=False)

            if not results.get("results"):
                return None

            url = results["results"][0]["url"]
            title = results["results"][0]["title"]

            # Try to extract full content
            try:
                url_extract = self.tavily_client.extract(url)
                if url_extract.get("results") and len(url_extract["results"]) > 0:
                    raw_content = url_extract["results"][0]["raw_content"]
                    # Summarize with focus on relevance
                    prompt = SUMMARIZE_SOURCE_PROMPT.format(
                        user_input=original_question,
                        web_search_results=raw_content
                    )
                    llm_result = self.llm.invoke(prompt)
                    resume = llm_result.content
                else:
                    resume = results["results"][0].get("content", "No content available")
            except Exception:
                resume = results["results"][0].get("content", "No content available")

            return QueryResult(title=title, url=url, resume=resume)

        except Exception:
            return None

    def _grounded_writer(self, state: ReportState) -> dict:
        """Generate initial response using Grounded Generation."""
        search_results = self._format_sources(state.queries_results)

        prompt = GROUNDED_SYNTHESIS_PROMPT.format(
            user_input=state.user_input,
            search_results=search_results
        )

        llm_result = self.llm.invoke(prompt)

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

        llm_result = self.llm.invoke(prompt)
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

        llm_result = self.llm.invoke(prompt)

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
            "queries": result.get("queries", [])
        }

    async def search_stream(self, query: str) -> AsyncGenerator[dict, None]:
        """Execute a search with streaming updates."""
        yield {"event": "status", "data": {"message": "Starting research...", "step": "init"}}

        # Build queries with CoT
        yield {"event": "status", "data": {"message": "Planning search strategy...", "step": "queries"}}

        state = ReportState(user_input=query)
        queries_result = self._build_queries(state)
        queries = queries_result["queries"]

        yield {
            "event": "queries",
            "data": {"queries": queries, "count": len(queries)}
        }

        # Search each query
        all_results = []
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

            result = self._execute_single_search(q, query)
            if result:
                all_results.append(result)
                yield {
                    "event": "source",
                    "data": {
                        "title": result.title,
                        "url": result.url,
                        "resume": result.resume[:200] + "..." if len(result.resume) > 200 else result.resume
                    }
                }

        # Grounded synthesis
        yield {"event": "status", "data": {"message": "Synthesizing with source verification...", "step": "synthesis"}}

        state = ReportState(
            user_input=query,
            queries=queries,
            queries_results=all_results
        )
        draft_result = self._grounded_writer(state)
        state.draft_response = draft_result["draft_response"]
        state.iteration_count = draft_result["iteration_count"]

        # Self-reflection
        yield {"event": "status", "data": {"message": "Evaluating response quality...", "step": "reflection"}}

        reflect_result = self._self_reflect(state)
        state.reflection_verdict = reflect_result["reflection_verdict"]
        state.reflection_issues = reflect_result["reflection_issues"]
        state.iteration_count = reflect_result["iteration_count"]

        # Improve if needed
        if state.reflection_verdict == "NEEDS_IMPROVEMENT" and state.iteration_count <= MAX_REFLECTION_ITERATIONS:
            yield {"event": "status", "data": {"message": "Improving response...", "step": "improvement"}}
            improve_result = self._improve_response(state)
            state.draft_response = improve_result["draft_response"]

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
                "reflection_verdict": state.reflection_verdict
            }
        }


def create_research_agent() -> ResearchAgent:
    """Factory function for creating agents."""
    return ResearchAgent()
