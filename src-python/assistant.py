import datetime
from typing import List, Optional

from langchain_core.messages import HumanMessage

from manager import ConfigManager, SessionManager
from models import *
from manager import *

class Assistant:
    def __init__(
        self,
        config_manager: ConfigManager,
        session_manager: SessionManager,
    ):
        
        self.llm = LLM(config_manager=config_manager)
        self.embedding = Embedding(config_manager=config_manager)
        self.store = VectorStore(config_manager=config_manager, embedding_model=self.embedding)
        self.session_manager: SessionManager = session_manager
        self.config_manager: ConfigManager = config_manager

    def check(self) -> dict:
        """Check status of all components."""
        return {
            "llm": self.llm.check(),
            "embedding": self.embedding.check(),
            "vectorstore": self.store.check(),
            "session": self.session_manager.check(),
        }

    def setup_rag(self, documents: List[str], metadatas: Optional[List[dict]] = None, auto_save: bool = False):
        """
        Initialize RAG system with documents.
        This handles the initial setup of the vector store with documents.
        
        Args:
            documents: List of text documents to embed and store
            metadatas: Optional metadata for each document
        """
        if not documents:
            raise ValueError("No documents provided for RAG setup")
        
            
        self.store.add_documents(documents, metadatas)
        
        print(f"✓ RAG setup complete: {len(documents)} documents indexed")

        if auto_save:
            self.save_vectorstore()

    def add_documents(self, documents: List[str], metadatas: Optional[List[dict]] = None):
        """
        Add more documents to an existing RAG system.
        
        Args:
            documents: List of text documents to add
            metadatas: Optional metadata for each document
        """
        self.store.add_documents(documents, metadatas)
        print(f"✓ Added {len(documents)} documents to vector store")

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
        if not self.store.store:
            raise ValueError("Vector store not initialized. Call setup_rag() first.")
        
        # Retrieve relevant documents
        docs = self.store.retrieve(query, k=k)
        
        if not docs:
            return "No relevant documents found. Please add documents first using setup_rag()."
        
        # Join documents as context
        context = "\n\n".join(docs)

        timestamp = datetime.datetime.now()
        response = self.llm.process(query, context)

        # Add to session history
        self.session_manager.add_to_history(query, is_ai=False, timestamp=timestamp)
        self.session_manager.add_to_history(response, is_ai=True, timestamp=timestamp)

        return response

    def query(self, query: str) -> str:
        """Simple chat without RAG."""
        timestamp = datetime.datetime.now()
        response = self.llm.process(query)

        # Add to session history
        self.session_manager.add_to_history(query, is_ai=False, timestamp=timestamp)
        self.session_manager.add_to_history(response, is_ai=True, timestamp=timestamp)

        return response

    def save_vectorstore(self):
        """Save vector store to disk."""
        self.store.save()
        print(f"✓ Vector store saved")

    def load_vectorstore(self):
        """Load vector store from disk."""
        self.store.load()
        print(f"✓ Vector store loaded")