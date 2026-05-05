import logging
import os

from langchain_community.document_loaders import PyPDFLoader

logger = logging.getLogger(__name__)

def extract_content(content) -> str:
    """Normalise LLM response content to a plain string."""
    
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and "text" in item:
                parts.append(item["text"])
            elif isinstance(item, str):
                parts.append(item)
        return "\n".join(parts)
    return content

def text(element, tag: str, ns: dict) -> str:
    """Safely extract text from an XML child element.

    Returns an empty string if the element is missing or has no text,
    instead of raising AttributeError on None.find().text.
    """
    node = element.find(tag, ns)
    if node is None or node.text is None:
        return ""
    return node.text.strip()

def extract_pdf_text(file_path: str) -> str:
    """Extract full text from a PDF file.
    Args:
        file_path: Absolute path to the PDF
    Returns:
        Full extracted text as a single string
    """
    if not file_path or not os.path.exists(file_path):
        raise ValueError(f"PDF not found at path: {file_path}")
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    logger.debug(
        f"Extracted {len(documents)} pages from {os.path.basename(file_path)}"
    )
    return "\n\n".join([doc.page_content for doc in documents])