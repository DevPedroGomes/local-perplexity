"""
Prompts for the Research Agent with Chain-of-Thought reasoning.
"""

# Base system prompt
SYSTEM_PROMPT = """You are an expert research assistant. Your goal is to provide accurate,
well-sourced information based on web search results. Always prioritize factual accuracy
and cite your sources."""


# Chain-of-Thought Query Generation
QUERY_GENERATION_PROMPT = """You are a research query planner. Your task is to generate effective
search queries to answer the user's question.

Think step by step:

1. UNDERSTAND: What is the user really asking? Identify the core intent.
2. IDENTIFY: What are the key concepts, entities, and terms?
3. CONSIDER: What different angles or aspects could help answer this comprehensively?
4. DIVERSIFY: Ensure queries cover different facets (facts, recent developments, expert opinions).
5. FORMULATE: Write clear, specific, and searchable queries.

User Question:
<USER_QUESTION>
{user_input}
</USER_QUESTION>

Based on your analysis, generate 3-5 diverse search queries that will help gather comprehensive
information to answer this question. Each query should target a different aspect or angle.
"""


# Grounded Generation - Synthesis with source verification
GROUNDED_SYNTHESIS_PROMPT = """You are writing a research response based on verified sources.

User Question:
<USER_QUESTION>
{user_input}
</USER_QUESTION>

Available Sources:
<SOURCES>
{search_results}
</SOURCES>

IMPORTANT RULES:
1. ONLY include information that is directly supported by the sources above.
2. Add citation numbers [1], [2], etc. immediately after each claim that comes from a source.
3. If you cannot find support for a claim in the sources, DO NOT include it.
4. If sources conflict, mention the disagreement.
5. Be comprehensive but factual - aim for 400-600 words.

Structure your response with:
- A clear introduction addressing the question
- Well-organized body paragraphs with citations
- A brief conclusion summarizing key findings

Write your grounded response:
"""


# Self-Reflection prompt (uses structured output — no format instructions needed)
SELF_REFLECTION_PROMPT = """You are a critical reviewer evaluating a research response.

Original Question:
<QUESTION>
{user_input}
</QUESTION>

Available Sources:
<SOURCES>
{sources_summary}
</SOURCES>

Generated Response:
<RESPONSE>
{draft_response}
</RESPONSE>

Evaluate the response by checking:

1. COMPLETENESS: Does it answer the main question and key aspects?
2. ACCURACY: Are all claims supported by the provided sources?
3. CITATIONS: Are citations properly placed after claims?
4. CLARITY: Is it well-structured and easy to understand?
5. GAPS: Is there important information from the sources that was missed?

Based on your evaluation, provide your verdict as PASS if the response is good quality, or NEEDS_IMPROVEMENT if it has significant issues. If NEEDS_IMPROVEMENT, list the specific issues to fix.
"""


# Improvement prompt (used when self-reflection finds issues)
IMPROVE_RESPONSE_PROMPT = """You are improving a research response based on feedback.

Original Question:
<QUESTION>
{user_input}
</QUESTION>

Available Sources:
<SOURCES>
{search_results}
</SOURCES>

Previous Response:
<PREVIOUS_RESPONSE>
{draft_response}
</PREVIOUS_RESPONSE>

Issues Identified:
<ISSUES>
{issues}
</ISSUES>

Rewrite the response to address these issues. Remember:
- Only include information supported by the sources
- Add proper citations [1], [2], etc.
- Maintain good structure and clarity
- Aim for 400-600 words

Improved response:
"""


# Follow-up Questions Generation
FOLLOW_UP_QUESTIONS_PROMPT = """Based on the research question and the response generated, suggest 3 follow-up questions that the user might want to explore next.

Original Question:
<QUESTION>
{user_input}
</QUESTION>

Generated Response (summary):
<RESPONSE>
{response_summary}
</RESPONSE>

Generate 3 follow-up questions that:
1. Explore deeper aspects of the topic not fully covered
2. Investigate related or adjacent topics the user might find interesting
3. Challenge or expand on the findings in the response

The questions should be specific, actionable, and different from the original question.
"""
