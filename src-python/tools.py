from langchain.tools import tool

@tool
def search_arxiv(query: str, limit: int = 10) -> str:
    """Search the arXiv database for papers matching the query.

    Args:
        query: Search terms to look for
        limit: Maximum number of results to return
    """
    return f"Found {limit} results for '{query}'"

@tool
def recommend_papers(paper_id: str) -> str:
    """Recommend papers similar to the one with the given arXiv ID.

    Args:
        paper_id: The arXiv ID of the paper for which to recommend similar papers
    """
    return f"Recommended papers for {paper_id}"