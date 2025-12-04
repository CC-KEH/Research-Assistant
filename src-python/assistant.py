import datetime

from langchain_core.messages import HumanMessage

from models import *
from manager import *

class Assistant:
    def __init__(
        self,
        llm: LLM,
        embedding: Embedding,
        store: VectorStore,
        session_manager: SessionManager,
        config_manager: ConfigManager = None,
    ):
        self.llm = llm
        self.embedding = embedding
        self.store = store
        self.sessions = session_manager
        self.config_manager = config_manager

    def check(self) -> dict:
        """Check status of all components."""
        return {
            "llm": self.llm.check(),
            "embedding": self.embedding.check(),
            "vectorstore": self.store.check(),
            "session": self.sessions.check(),
        }

    def process_tab(self, tab_id: str, text: str) -> str:
        """
        Process text using a tab's custom prompt from config.json.

        Supports all standard tabs (view, summary, contributions, critical-analysis,
        dictionary, future-work) and custom tabs defined in config.

        Args:
            tab_id: ID of the tab (e.g., "summary", "contributions", "custom-tab-1")
            text: Text to process

        Returns:
            Processed result from the LLM
        """
        if not self.config_manager:
            raise ValueError("ConfigManager not provided")

        if not self.llm.model:
            raise ValueError("LLM not initialized")

        # Get tab configuration
        tab = self.config_manager.get_tab_by_id(tab_id)
        if not tab:
            raise ValueError(f"Tab '{tab_id}' not found in config")

        # Get prompt and replace placeholder
        prompt = tab.get("prompt", "")
        if not prompt:
            raise ValueError(f"No prompt defined for tab '{tab_id}'")

        # Replace {text} placeholder with actual text
        formatted_prompt = prompt.replace("{text}", text)

        messages = [HumanMessage(content=formatted_prompt)]

        response = self.llm.model.invoke(messages)
        return response.content

    def rag(self, query: str, k: int = 4, filter: dict = None) -> str:
        """Retrieve relevant documents and generate answer."""
        docs = self.store.retrieve(query, k=k, filter=filter)
        context = "\n\n".join(docs)

        timestamp = datetime.datetime.now()
        response = self.llm.process(query, context)

        # Add to session history (is_ai=False for user, is_ai=True for assistant)
        self.sessions.add_to_history(query, is_ai=False, timestamp=timestamp)
        self.sessions.add_to_history(response, is_ai=True, timestamp=timestamp)

        return response

    def chat(self, query: str) -> str:
        """Simple chat without RAG."""
        timestamp = datetime.datetime.now()
        response = self.llm.process(query)

        # Add to session history
        self.sessions.add_to_history(query, is_ai=False, timestamp=timestamp)
        self.sessions.add_to_history(response, is_ai=True, timestamp=timestamp)

        return response
