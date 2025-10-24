from pydantic import BaseModel
from typing import List
from tavily import TavilyClient
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send
import streamlit as st
from schemas import *
from prompts import *

from dotenv import load_dotenv
load_dotenv()

llm = ChatOllama(model="llama3.1:8b")
reasoning_llm = ChatOllama(model="", )

builder = StateGraph(ReportState)

#TODO

#NODES
def build_first_queries(state: ReportState) -> ReportState:
    class QueryList(BaseModel):
        queries: List[str]

    user_input = state.user_input
    prompt = build_queries_prompt.format(user_input=user_input)
    query_llm = llm.with_structured_output(QueryList)
    result = query_llm.invoke(prompt)

    return {"queries": result.queries}

def spawn_researchers(state: ReportState):
    return [Send("single_search", query) for query in state.queries]

def single_search(query: str):
    tavily_client = TavilyClient()
    results = tavily_client.search(query, max_results=1, include_raw_content=False)

    url = results["results"][0]["url"]
    url_extract = tavily_client.extract(url)
    
    if len(url_extract["results"]) > 0:
        raw_content = url_extract["results"][0]["raw_content"]
        prompt = resume_search.format(user_input=query, search_results=raw_content)
        llm_result = llm.invoke(prompt)
        query_results = QueryResult(title=results["results"][0]["title"], url=url, resume=llm_result.content)
        return {"query_results": [query_results]}


def final_writer(state: ReportState):
    search_results = ""
    references = ""
    for i, result in enumerate(state.queries_results):
        search_results += f"{i+1}\n"
        search_results += f"Title: {result.title}\n"
        search_results += f"URL: {result.url}\n"
        search_results += f"Content: {result.resume}\n"
        search_results += f"====================\n\n"

        references += f"{i+1} - [{result.title}]({result.url})\n"

    prompt = build_final_response.format(user_input=state.user_input,
                                         search_results=search_results)

    llm_result = reasoning_llm.invoke(prompt)
    final_response = llm_result.content + "\n\n References:\n" + references
    # print(final_response)

    return {"final_response": final_response}

#EDGES
builder = StateGraph(ReportState)
builder.add_node("build_first_queries", build_first_queries)
builder.add_node("single_search", single_search)
builder.add_node("final_writer", final_writer)

builder.add_edge(START, "build_first_queries")
builder.add_conditional_edges("build_first_queries", spawn_researchers, ["single_search"])
builder.add_edge("single_search", "final_writer")
builder.add_edge("final_writer", END)
graph = builder.compile()


if __name__ == "__main__":
    from IPython.display import Image, display
    display(Image(graph.get_graph().draw_mermaid_png()))

    st.title("Research Agent - Local Plerplexity")
    user_input = st.text_input("Enter your question")
    if st.button("Search"):
        # with st.spinner("Gerando resposta", show_time=True):
        with st.status("Generating response"):
            response = graph.invoke({"user_input": user_input})
            st.write(response)
            
        #     for output in graph.stream({"user_input": user_input}, stream_mode="debug"):
        #         if output["type"] == "task_result":
        #             st.write(f"Running {output['payload']['name']}")
        #         st.write(output)

        # # print(output)
        # response = output["payload"]["result"][0][1]
        # think_str = response.split("</think>")[0]
        # final_response = response.split("</think>")[1]

        # with st.expander("💭 Reasoning", expanded=False):
        #     st.write(think_str)
        # st.write(final_response)
