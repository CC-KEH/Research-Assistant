import datetime
from typing import List, Optional

from langchain_core.messages import HumanMessage

from manager import ConfigManager, SessionManager
from model import Model

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
        self.llm = Model(
            config_manager=config_manager,
            session_manager=session_manager,
            save_chats=save_chats,
            verbose=verbose
        )
        self.session_manager = session_manager
        self.config_manager = config_manager

    def check(self) -> dict:
        """Check status of all components."""
        return {
            "llm": self.llm.check(),
            "vectorstore": self.llm.get_vector_store_info(),
            "knowledge_store": self.llm.get_knowledge_store_info(),
            "sessions": {
                "total_sessions": len(self.session_manager.get_sessions()),
                "active_session": self.session_manager.active_session_index,
            }
        }

    def setup_rag(self, documents: List[str], metadatas: Optional[List[dict]] = None):
        """
        Initialize RAG system with documents.
        
        Args:
            documents: List of text documents to embed and store
            metadatas: Optional metadata for each document
        """
        if not documents:
            raise ValueError("No documents provided for RAG setup")
        
        self.llm.add_documents(documents, metadatas)
        self.llm.save()
        print(f"✓ RAG setup complete: {len(documents)} documents indexed")

    def add_documents(self, documents: List[str], metadatas: Optional[List[dict]] = None):
        """
        Add more documents to an existing RAG system.
        
        Args:
            documents: List of text documents to add
            metadatas: Optional metadata for each document
        """
        self.llm.add_documents(documents, metadatas)
        print(f"✓ Added {len(documents)} documents to vector store")

    def process_tab(self, tab_id: str, text: str) -> str:
        """
        Process text using a tab's custom prompt from config.json.

        Supports all standard tabs and custom tabs defined in config.

        Args:
            tab_id: ID of the tab (e.g., "summary", "contributions")
            text: Text to process

        Returns:
            Processed result from the LLM
        """
        if not self.config_manager:
            raise ValueError("ConfigManager not provided")

        if not self.llm._llm:
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

        response = self.llm.llm.invoke(messages)
        return response.content

    def query_rag(self, query: str, k: int = 4) -> str:
        """
        Retrieve relevant documents and generate answer using RAG.
        
        Args:
            query: User's question
            k: Number of documents to retrieve
            
        Returns:
            LLM response based on retrieved context
        """
        # Check if vector store is initialized
        if not self.llm.store:
            raise ValueError("Vector store not initialized. Call setup_rag() first.")
        
        # Retrieve relevant documents
        docs = self.llm.retrieve(query, k=k)
        
        if not docs:
            return "No relevant documents found. Please add documents first using setup_rag()."
        
        # Join documents as context
        context = "\n\n".join(docs)
        
        # Process through LLM with context (don't save here, let app.py handle it)
        response = self.llm.process(query, context=context, use_context=False)
        
        return response

    def query(self, query: str) -> str:
        """Simple chat without RAG."""
        response = self.llm.process(query, use_context=False)
        return response

    def save_vectorstore(self):
        """Save vector store to disk."""
        self.llm.save()
        print(f"✓ Vector store saved")

    def load_vectorstore(self):
        """Load vector store from disk."""
        self.llm.load()
        print(f"✓ Vector store loaded")

    # ==================== Convenient shortcuts ====================

    def create_session(self, name: str, tags: List[str] = None, context: str = "") -> int:
        """Create a new chat session."""
        return self.session_manager.create_session(name, tags, context)

    def switch_session(self, session_index: int):
        """Switch to a different session."""
        self.session_manager.switch_session(session_index)

    def get_sessions(self) -> List[dict]:
        """Get all sessions."""
        return self.session_manager.get_sessions()

    def get_chat_history(self) -> List[dict]:
        """Get current session's chat history."""
        if self.session_manager.active_session_index is None:
            return []
        return self.session_manager.get_formatted_history()