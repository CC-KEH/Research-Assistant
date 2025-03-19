from pathlib import Path

PROJECT_CONFIG = "project_config.json"
SUMMARIES_DIR = "Library/Summaries"
PAPERS_DIR = "Library/Papers"
NOTES_DIR = "Library/Notes"
DIRECTORIES_PATH = "Library/"
VECTOR_STORE_PATH = "/VectorStore/faiss_index"
CHAT_HISTORY_DIR = "ChatHistory"
CONFIG_FILE = Path("project_config.json")

LLMS = {
    "Google": ["gemini-1.5-pro-latest", "gemini-1.5-turbo"],
    "OpenAI": ["gpt3", "gpt4"],
    "Anthropic": ["Claude", "Claude"],
    "Grok": ["grok-1.0", "grok-1.0"]
}
