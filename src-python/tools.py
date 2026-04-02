import json
import logging
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

from utils import text
from langchain.tools import tool

logger = logging.getLogger(__name__)


@tool("query_arxiv", description="Returns a JSON string of papers matching the topic.")
def query_arxiv(query: str, limit: int = 10) -> str:
    """Search the arXiv database for papers matching a topic.

    Args:
        query: Topic to search for (e.g. "transformer attention mechanisms")
        limit: Maximum number of results (capped at 20)

    Returns:
        JSON string — list of dicts with id, title, summary, authors, updated.
        Returns a JSON error object string on failure.
    """

    limit = min(max(1, limit), 20)

    params = urllib.parse.urlencode(
        {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": limit,
            "sortBy": "lastUpdatedDate",
            "sortOrder": "descending",
        }
    )

    url = f"https://export.arxiv.org/api/query?{params}"

    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            raw = response.read().decode("utf-8")
    except Exception as e:
        logger.error(f"arXiv request failed: {e}")
        return json.dumps({"error": f"Failed to fetch arXiv results: {e}"})

    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        logger.error(f"arXiv XML parse error: {e}")
        return json.dumps({"error": f"Failed to parse arXiv response: {e}"})

    ns = {"atom": "http://www.w3.org/2005/Atom"}

    results = []
    for entry in root.findall("atom:entry", ns):
        authors = [
            text(a, "atom:name", ns)
            for a in entry.findall("atom:author", ns)
        ]
        results.append(
            {
                "id":      text(entry, "atom:id", ns),
                "title":   text(entry, "atom:title", ns),
                "summary": text(entry, "atom:summary", ns),
                "authors": authors,
                "updated": text(entry, "atom:updated", ns),
            }
        )
    return json.dumps(results)