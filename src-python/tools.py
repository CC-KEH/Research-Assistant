import urllib.request as libreq
import urllib.parse
import xml.etree.ElementTree as ET

@tool
def query_arxiv(query: str, limit: int = 10, sortBy: str = "lastUpdatedDate", sortOrder: str = "descending") -> list[dict]:
    """Search the arXiv database for papers matching a topic.

    Args:
        query: Topic to search for (e.g., "quantum computing", "large language models")
        limit: Maximum number of results to return
        sortBy: "relevance", "lastUpdatedDate", or "submittedDate"
        sortOrder: "ascending" or "descending"
    """
    encoded_query = urllib.parse.quote(query)

    params = urllib.parse.urlencode({
    "search_query": f"all:{query}",
    "start": 0,
    "max_results": limit,
    "sortBy": sortBy,
    "sortOrder": sortOrder
    })

    url = f"http://export.arxiv.org/api/query?{params}"

    with libreq.urlopen(url) as response:
        r = response.read().decode('utf-8')

    root = ET.fromstring(r)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}

    results = []
    for entry in root.findall('atom:entry', ns):
        authors = [a.find('atom:name', ns).text for a in entry.findall('atom:author', ns)]
        results.append({
            "id":       entry.find('atom:id', ns).text.strip(),
            "title":    entry.find('atom:title', ns).text.strip(),
            "summary":  entry.find('atom:summary', ns).text.strip(),
            "authors":  authors,          # replaces "publisher"
            "updated":  entry.find('atom:updated', ns).text.strip(),
        })

    return results

@tool
def query_tavily(query: str, limit: int = 10) -> list[dict]:
    """Search the Tavily database for papers matching a topic.

    Args:
        query: Topic to search for (e.g., "quantum computing", "large language models")
        limit: Maximum number of results to return
    """
    encoded_query = urllib.parse.quote(query)

    params = urllib.parse.urlencode({
        "query": query,
        "limit": limit
    })

    url = f"https://api.tavily.com/v1/search?{params}"

    with libreq.urlopen(url) as response:
        r = response.read().decode('utf-8')

    data = json.loads(r)
    results = []
    for item in data['results']:
        results.append({
            "id":       item['id'],
            "title":    item['title'],
            "summary":  item['summary'],
            "authors":  item['authors'],
            "updated":  item['updated'],
        })

    return results