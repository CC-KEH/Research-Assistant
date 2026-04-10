import logging
from typing import List, Optional

from langchain.agents import create_agent

from utils import extract_pdf_text
from tools import query_arxiv
from model import Model
from manager import ConfigManager, SessionManager

logger = logging.getLogger(__name__)


class Assistant:
    """Wrapper around Model to provide additional utilities and processing capabilities."""

    def __init__(
        self,
        config_manager: ConfigManager,
        session_manager: SessionManager,
        save_chats: bool = True,
        verbose: bool = False,
    ):
        """Initialize Assistant with all required components.

        Args:
            config_manager: Configuration manager instance
            session_manager: Session manager instance
            save_chats: Whether to auto-save chats (passed to Model)
            verbose: Enable verbose logging
        """
        self.model = Model(
            config_manager=config_manager,
            session_manager=session_manager,
            save_chats=save_chats,
            verbose=verbose,
        )
        self.session_manager = session_manager
        self.config_manager = config_manager

        self.save_chats = save_chats
        self.verbose = verbose

    def check(self) -> dict:
        """Check status of all components."""
        return {
            "llm": self.model.check(),
            "vectorstore": self.model.get_vector_store_info(),
            "knowledge_store": self.model.get_knowledge_store_info(),
            "sessions": {
                "total_sessions": len(self.session_manager.get_sessions()),
                "active_session": self.session_manager.active_session_index,
            },
        }

    def add_documents(
        self,
        documents: List[str],
        metadatas: Optional[List[dict]] = None,
        save: bool = False,
    ) -> None:
        """Add documents to the vector store.

        Args:
            documents: List of text documents to embed and store
            metadatas: Optional metadata for each document
            save: If True, persist the vector store to disk after adding
        """
        if not documents:
            raise ValueError("No documents provided")

        self.model.add_documents(documents, metadatas)

        if save:
            self.model.save()
            logger.info("Vector store saved")

    def process_tab(self, tab_id: str, file_info: dict) -> str:
        """Process a PDF file using a tab's prompt from config.json.

        Args:
            tab_id: The tab identifier to look up in config
            file_info: Dict containing file_path or filePath key

        Returns:
            Processed string result from the LLM
        """
        if not self.config_manager:
            raise ValueError("ConfigManager not provided")

        tab = self.config_manager.get_tab_by_id(tab_id)
        if not tab:
            raise ValueError(f"Tab '{tab_id}' not found in config")

        prompt = tab.get("prompt", "")
        if not prompt:
            raise ValueError(f"No prompt defined for tab '{tab_id}'")

        file_path = file_info.get("filePath") or file_info.get("file_path")

        if not file_path:
            raise ValueError(
                "file_info must contain 'file_path' or 'filePath'"
            )

        logger.info(f"Processing tab: {tab_id}")
        pdf_text = extract_pdf_text(file_path)

        # ── arXiv tab: run as agent so the tool is actually invoked ──────────
        if tab_id == "view":
            return "View tab selected. This tab is meant for displaying PDFs and does not invoke any LLM."

        if tab_id == "arxiv":
            arxiv_llm = self.model._get_llm_without_thinking()
            agent_executor = create_agent(
                arxiv_llm,
                tools=[query_arxiv],
                system_prompt=prompt,
            )
            result = agent_executor.invoke({"messages": [{"role": "user", "content": pdf_text}]})
            logger.info(f"Finished processing tab: {tab_id}")
            return result["messages"][-1].content

        # ── All other tabs: plain LLM call ───────────────────────────────────
        full_prompt = f"{prompt}\n\nDocument Content:\n{pdf_text}"
        logger.info(f"Finished processing tab: {tab_id}")
        return self.model.process(full_prompt, use_context=False)

    def query_rag(self, query: str, k: int = 4) -> str:
        """Retrieve relevant documents and generate an answer using RAG.

        Args:
            query: User's question
            k: Number of documents to retrieve

        Returns:
            LLM response based on retrieved context
        """
        if not self.model.store:
            raise ValueError(
                "Vector store not initialized. Call add_documents(save=True) first."
            )

        docs = self.model.retrieve(query, k=k)
        if not docs:
            return "No relevant documents found. Please add documents first."

        context = "\n\n".join(docs)

        response = self.model.process(query, context=context, use_context=False)
        return response

    def query(self, query: str) -> str:
        """Simple chat without RAG."""
        return self.model.process(query, use_context=False)

    def save_vectorstore(self) -> None:
        """Save vector store to disk."""
        self.model.save()
        logger.info("Vector store saved")

    def load_vectorstore(self) -> None:
        """Load vector store from disk."""
        self.model.load()
        logger.info("Vector store loaded")

    def get_chat_history(self) -> List[dict]:
        """Get current session's chat history.

        Returns:
            List of message dicts for the active session.

        Raises:
            ValueError: If no session is currently active — callers should
                distinguish between 'session is empty' and 'no session exists'.
        """
        if self.session_manager.active_session_index is None:
            raise ValueError(
                "No active session. Create or switch to a session first."
            )
        return self.session_manager.get_formatted_history(self.session_manager.active_session_index)