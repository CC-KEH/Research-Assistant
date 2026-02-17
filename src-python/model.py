import hashlib
import os
import json
from typing import List, Optional, Dict, Tuple
from pathlib import Path

from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from langchain_anthropic import ChatAnthropic
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage

from manager import *


class Model:
    # Class-level cache for model instances to avoid recreating them
    _model_cache: Dict[str, any] = {}
    _embedding_cache: Dict[str, any] = {}

    def __init__(
        self,
        config_manager: ConfigManager,
        session_manager: SessionManager,
        use_cached_store: bool = True,
        verbose: bool = False,
        save_chats: bool = False,
    ):
        """Initialize Model with knowledge store PDFs.

        Args:
            config_manager: ConfigManager instance for configuration
            session_manager: SessionManager instance for chat persistence
            use_cached_store: Whether to use previously saved vector store if available
            verbose: Enable detailed logging
            save_chats: Enable automatic chat saving to file
        """
        self.config_manager = config_manager
        self.session_manager = session_manager
        self.verbose = verbose
        self.save_chats_enabled = save_chats

        # Get configurations
        self.ai_config = self.config_manager.get_ai_config()
        self.basic_config = self.config_manager.get_basic_config()
        self.active_llm = self.ai_config.get("activeLlm")
        self.llm_config = self.config_manager.get_llm_config(model_name=self.active_llm)

        # Setup paths - use first project's path from basicConfig
        basic_configs = (
            self.basic_config
            if isinstance(self.basic_config, list)
            else [self.basic_config]
        )
        project_config = basic_configs[0] if basic_configs else {}
        project_path = project_config.get("projectPath", "./")

        self.project_path = project_path
        self.persist_directory = os.path.join(project_path, "vector_store")

        # Get knowledge store files from config
        self.knowledge_store_files = self.config_manager.get_knowledge_store_files()
        self.pdf_paths = self._extract_pdf_paths()

        # Initialize API key
        raw_api_key = self.llm_config.get("apiKey", "")
        self.api_key = raw_api_key.strip() if raw_api_key else None

        # Get chat prompt
        self.chat_prompt = self.ai_config.get(
            "chatPrompt", "You are a helpful assistant."
        )

        # Initialize models (lazy loading)
        self._llm = None
        self._embedding = None
        self._store = None

        # Message cache
        self._message_cache: Dict[str, List[BaseMessage]] = {}

        # Track if PDFs have been loaded
        self._pdfs_loaded = False
        self._loaded_files = set()

        # Log initialization
        self._log(
            f"Initializing Model with {len(self.pdf_paths)} PDF(s) from knowledge store"
        )

        # Initialize vector store with knowledge store PDFs
        self._initialize_vector_store(use_cached_store=use_cached_store)

    def _log(self, message: str):
        """Log message if verbose mode enabled."""
        if self.verbose:
            print(f"[Model] {message}")

    def _extract_pdf_paths(self) -> List[str]:
        """Extract PDF file paths from knowledge store config.

        Returns:
            List of absolute paths to PDF files marked as feedLlm=true
        """
        pdf_paths = []

        for file_info in self.knowledge_store_files:
            # Only include files that should be fed to LLM
            if not file_info.get("feedLlm", False):
                self._log(f"Skipping {file_info.get('fileName')} (feedLlm=False)")
                continue

            # Only include PDF files
            file_type = file_info.get("fileType", "").lower()
            if file_type != "pdf":
                self._log(
                    f"Skipping {file_info.get('fileName')} (not PDF, type: {file_type})"
                )
                continue

            file_path = file_info.get("filePath")
            if file_path and os.path.exists(file_path):
                pdf_paths.append(file_path)
                self._log(f"Found PDF: {file_info.get('fileName')} at {file_path}")
            else:
                self._log(f"Warning: PDF not found at {file_path}")

        return pdf_paths

    def _initialize_vector_store(self, use_cached_store: bool = True):
        """Initialize vector store from knowledge store PDFs or cached store.

        Args:
            use_cached_store: If True, try to load cached store first
        """
        # Try loading cached store first if requested
        if use_cached_store and self._load_cached_store():
            self._log(f"Loaded vector store from cache: {self.persist_directory}")
            self._pdfs_loaded = True
            return

        # Load PDFs and build vector store
        if self.pdf_paths:
            self._log(f"Loading {len(self.pdf_paths)} PDF(s) from knowledge store...")
            documents = self._load_pdfs()

            if documents:
                self._log(f"Building vector store from {len(documents)} documents...")
                self._build_vector_store_from_documents(documents)
                self._pdfs_loaded = True
                self._log("Vector store initialized successfully")
            else:
                self._log("Warning: No documents extracted from PDFs")
                self._store = None
        else:
            self._log("No PDFs in knowledge store. Vector store will be created empty.")
            self._store = None

    def _load_pdfs(self) -> List[Document]:
        """Load and parse PDF files from knowledge store.

        Returns:
            List of Document objects extracted from PDFs
        """
        all_documents = []

        for pdf_path in self.pdf_paths:
            if not os.path.exists(pdf_path):
                self._log(f"Warning: PDF file not found: {pdf_path}")
                continue

            try:
                file_name = os.path.basename(pdf_path)
                self._log(f"  Loading: {file_name}")

                loader = PyPDFLoader(pdf_path)
                documents = loader.load()

                # Add metadata to track source
                for doc in documents:
                    doc.metadata["source_pdf"] = file_name
                    doc.metadata["source_path"] = pdf_path

                all_documents.extend(documents)
                self._loaded_files.add(file_name)
                self._log(f"    → Extracted {len(documents)} pages from {file_name}")

            except Exception as e:
                self._log(f"Error loading PDF {pdf_path}: {e}")
                continue

        return all_documents

    def _build_vector_store_from_documents(self, documents: List[Document]):
        """Build FAISS vector store from documents.

        Args:
            documents: List of Document objects to index
        """
        try:
            self._store = FAISS.from_documents(documents, self.embedding)
            # Save for future use
            self.save()
        except Exception as e:
            self._log(f"Error building vector store: {e}")
            self._store = None

    def _load_cached_store(self) -> bool:
        """Try to load vector store from disk.

        Returns:
            True if successfully loaded, False otherwise
        """
        if not os.path.exists(self.persist_directory):
            return False

        try:
            self._store = FAISS.load_local(
                self.persist_directory,
                self.embedding,
                allow_dangerous_deserialization=True,
            )
            return True
        except Exception as e:
            self._log(f"Could not load cached vector store: {e}")
            return False

    @property
    def llm(self):
        """Lazy load LLM on first access."""
        if self._llm is None:
            self._llm = self._initialize_llm()
        return self._llm

    @property
    def embedding(self):
        """Lazy load embedding model on first access."""
        if self._embedding is None:
            self._embedding = self._initialize_embedding()
        return self._embedding

    @property
    def store(self):
        """Get vector store (initialized on construction)."""
        return self._store

    @store.setter
    def store(self, value):
        """Allow setting store directly."""
        self._store = value

    def check(self) -> dict:
        """Check if model is properly initialized."""
        return {
            "status": self._llm is not None,
            "model": self.active_llm,
            "vector_store_ready": self._store is not None,
            "pdfs_loaded": self._pdfs_loaded,
            "pdf_count": len(self.pdf_paths),
            "loaded_files": list(self._loaded_files),
        }

    def _get_model_key(self, model_type: str) -> str:
        """Generate a cache key for models."""
        return f"{self.active_llm}_{model_type}_{self.api_key}"

    def _initialize_llm(self):
        """Initialize LLM with caching to avoid recreating the same model."""
        if not self.api_key:
            raise ValueError(
                f"No API key configured for {self.active_llm}. "
                f"Please add your API key to config.json in llmConfig.{self.active_llm}.apiKey"
            )

        cache_key = self._get_model_key("llm")
        if cache_key in self._model_cache:
            return self._model_cache[cache_key]

        model_config = {
            "temperature": self.ai_config.get("temperature", 0.7),
            "max_tokens": self.ai_config.get("maxTokens", 2000),
            "api_key": self.api_key,
        }

        if self.active_llm == "google":
            llm = ChatGoogleGenerativeAI(
                model=self.llm_config.get("modelName", "gemini-pro"), **model_config
            )
        elif self.active_llm == "openai":
            llm = ChatOpenAI(
                model=self.llm_config.get("modelName", "gpt-4"), **model_config
            )
        elif self.active_llm == "anthropic":
            llm = ChatAnthropic(
                model=self.llm_config.get("modelName", "claude-3-5-sonnet-20241022"),
                **model_config,
            )
        else:
            raise ValueError(f"Unknown model: {self.active_llm}")

        self._model_cache[cache_key] = llm
        return llm

    def _initialize_embedding(self):
        """Initialize embedding model with caching."""
        cache_key = self._get_model_key("embedding")
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        embedding = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        self._embedding_cache[cache_key] = embedding
        return embedding

    def switch_llm(self, model_name: str):
        """Switch to a different LLM provider efficiently."""
        if model_name == self.active_llm:
            return  # No-op if same model

        self.ai_config["activeLlm"] = model_name
        self.config_manager.update_ai_config(self.ai_config)
        self.active_llm = model_name
        self.llm_config = self.config_manager.get_llm_config(model_name=self.active_llm)

        raw_api_key = self.llm_config.get("apiKey", "")
        self.api_key = raw_api_key.strip() if raw_api_key else None

        # Reset lazy-loaded properties
        self._llm = None
        self._embedding = None

        # Clear message cache when switching models
        self._message_cache.clear()
        self._log(f"Switched LLM to {model_name}")

    def get_chat_prompt(self) -> str:
        """Get the current chat prompt."""
        return self.chat_prompt

    def update_chat_prompt(self, new_prompt: str):
        """Update the chat prompt and clear cache."""
        self.chat_prompt = new_prompt
        self._message_cache.clear()

        if self.config_manager:
            config = self.config_manager.get()
            config["aiConfig"]["chatPrompt"] = new_prompt
            self.config_manager.save()
            self._log(f"Updated chat prompt")

    def _build_messages(self, query: str, context: str = "") -> List[BaseMessage]:
        """Build messages with caching to avoid rebuilding identical prompts."""
        cache_key = hashlib.md5(
            f"{self.chat_prompt}_{query}_{context}".encode()
        ).hexdigest()

        if cache_key in self._message_cache:
            return self._message_cache[cache_key]

        messages = [SystemMessage(content=self.chat_prompt)]

        if context:
            user_content = f"Context:\n{context}\n\nQuery: {query}"
        else:
            user_content = query

        messages.append(HumanMessage(content=user_content))

        self._message_cache[cache_key] = messages
        return messages

    def process(self, query: str, context: str = "", use_context: bool = True) -> str:
        """Process a query with optional context.

        Args:
            query: User query
            context: Optional explicit context (overrides auto-retrieval)
            use_context: Whether to auto-retrieve context from vector store

        Returns:
            LLM response
        """
        if not self.api_key:
            raise ValueError(
                f"No API key configured. Please set API key for {self.active_llm} in config.json"
            )

        # Auto-retrieve context from vector store if not provided
        if not context and use_context and self._store is not None:
            retrieved_docs = self.retrieve(query, k=3)
            if retrieved_docs:
                context = "\n\n".join(retrieved_docs)
                self._log(f"Retrieved {len(retrieved_docs)} documents for context")

        messages = self._build_messages(query, context)
        response = self.llm.invoke(messages)
        return response.content

    def embed(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not text or not text.strip():
            raise ValueError("Cannot embed empty text")
        return self.embedding.embed_query(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple documents efficiently.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors
        """
        texts = [t for t in texts if t and t.strip()]
        if not texts:
            return []
        return self.embedding.embed_documents(texts)

    def add_documents(self, docs: List[str], metadatas: Optional[List[dict]] = None):
        """Add documents to the vector store efficiently.

        Args:
            docs: List of document texts
            metadatas: Optional list of metadata dicts for each document
        """
        filtered_docs = []
        filtered_metas = []

        for doc, meta in zip(docs, metadatas or [{}] * len(docs)):
            if doc and doc.strip():
                filtered_docs.append(doc)
                filtered_metas.append(meta or {})

        if not filtered_docs:
            return

        documents = [
            Document(page_content=doc, metadata=meta)
            for doc, meta in zip(filtered_docs, filtered_metas)
        ]

        if self.store is None:
            self._store = FAISS.from_documents(documents, self.embedding)
        else:
            self.store.add_documents(documents)

        # Save updated store
        self.save()
        self._log(f"Added {len(filtered_docs)} documents to vector store")

    def retrieve(self, query: str, k: int = 4) -> List[str]:
        """Retrieve relevant documents for a query.

        Args:
            query: Search query
            k: Number of documents to retrieve

        Returns:
            List of relevant document texts
        """
        if not self.store:
            return []

        docs = self.store.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]

    def retrieve_with_scores(self, query: str, k: int = 4) -> List[Tuple[str, float]]:
        """Retrieve documents with similarity scores.

        Args:
            query: Search query
            k: Number of documents to retrieve

        Returns:
            List of tuples (document_text, similarity_score)
        """
        if not self.store:
            return []

        results = self.store.similarity_search_with_score(query, k=k)
        return [(doc.page_content, score) for doc, score in results]

    def retrieve_with_metadata(self, query: str, k: int = 4) -> List[Dict]:
        """Retrieve documents with metadata and scores.

        Args:
            query: Search query
            k: Number of documents to retrieve

        Returns:
            List of dicts with 'content', 'score', and 'metadata'
        """
        if not self.store:
            return []

        results = self.store.similarity_search_with_score(query, k=k)
        return [
            {
                "content": doc.page_content,
                "score": score,
                "metadata": doc.metadata,
            }
            for doc, score in results
        ]

    def batch_retrieve(self, queries: List[str], k: int = 4) -> List[List[str]]:
        """Retrieve documents for multiple queries efficiently.

        Args:
            queries: List of search queries
            k: Number of documents to retrieve per query

        Returns:
            List of lists containing relevant documents for each query
        """
        if not self.store:
            return [[] for _ in queries]

        return [self.retrieve(q, k) for q in queries]

    def save(self):
        """Save the vector store to disk."""
        if self._store is not None:
            try:
                os.makedirs(self.persist_directory, exist_ok=True)
                self._store.save_local(self.persist_directory)
                self._log(f"Vector store saved to {self.persist_directory}")
            except Exception as e:
                self._log(f"Error saving vector store: {e}")

    def load(self):
        """Load the vector store from disk."""
        load_path = self.persist_directory
        try:
            self._store = FAISS.load_local(
                load_path, self.embedding, allow_dangerous_deserialization=True
            )
            self._log(f"Vector store loaded from {load_path}")
        except Exception as e:
            self._log(f"Could not load vector store: {e}")
            self._store = None

    # ========================= CHAT PERSISTENCE METHODS =========================

    def create_chat_session(self, name: str, tags: List[str] = None, context: str = "") -> int:
        """Create a new chat session.

        Args:
            name: Session name
            tags: Optional list of tags
            context: Optional context for the session

        Returns:
            Index of the created session
        """
        try:
            session_index = self.session_manager.create_session(name, tags=tags, context=context)
            self._log(f"Created chat session: {name}")
            return session_index
        except Exception as e:
            self._log(f"Error creating chat session: {e}")
            return -1

    def switch_chat_session(self, session_index: int):
        """Switch to a different chat session.

        Args:
            session_index: Index of the session to switch to
        """
        try:
            self.session_manager.switch_session(session_index)
            self._log(f"Switched to session {session_index}")
        except Exception as e:
            self._log(f"Error switching session: {e}")

    def get_all_sessions(self) -> List[Dict]:
        """Get all chat sessions.

        Returns:
            List of session dictionaries
        """
        try:
            return self.session_manager.get_sessions()
        except Exception as e:
            self._log(f"Error getting sessions: {e}")
            return []

    def get_chat_history(self) -> List[Dict]:
        """Get the current chat history from session manager.

        Returns:
            List of chat messages
        """
        try:
            if self.session_manager.active_session_index is None:
                return []
            
            return self.session_manager.get_formatted_history()
        except Exception as e:
            self._log(f"Error getting chat history: {e}")
            return []

    def add_to_chat_history(self, role: str, content: str):
        """Add a message to the current chat history.

        Args:
            role: "user" or "assistant"
            content: The message content
        """
        try:
            if self.session_manager.active_session_index is None:
                self._log("Error: No active session. Create or switch to a session first.")
                return
            
            is_ai = (role == "assistant")
            self.session_manager.add_to_history(content, is_ai=is_ai)
            self._log(f"Added {role} message to chat history")
            
            # Auto-save is automatic through SessionManager.add_to_history
        except Exception as e:
            self._log(f"Error adding to chat history: {e}")

    def clear_chat_history(self):
        """Clear the current chat history."""
        try:
            if self.session_manager.active_session_index is not None:
                self.session_manager.reset_session(self.session_manager.active_session_index)
                self._log(f"Cleared chat history")
        except Exception as e:
            self._log(f"Error clearing chat history: {e}")

    def get_session_stats(self, session_index: int = None) -> Optional[Dict]:
        """Get statistics for a session.

        Args:
            session_index: Index of the session (uses active session if not provided)

        Returns:
            Dictionary with session statistics
        """
        try:
            if session_index is None:
                session_index = self.session_manager.active_session_index
            
            if session_index is None:
                return None
            
            return self.session_manager.get_session_stats(session_index)
        except Exception as e:
            self._log(f"Error getting session stats: {e}")
            return None

    # ========================= KNOWLEDGE STORE METHODS =========================

    def reload_knowledge_store(self, use_cached_store: bool = False):
        """Reload knowledge store PDFs and rebuild vector store.

        Args:
            use_cached_store: Whether to use cached store if available
        """
        self._log("Reloading knowledge store PDFs...")
        self.knowledge_store_files = self.config_manager.get_knowledge_store_files()
        self.pdf_paths = self._extract_pdf_paths()
        self._loaded_files.clear()
        self._initialize_vector_store(use_cached_store=use_cached_store)

    def get_knowledge_store_info(self) -> Dict:
        """Get information about knowledge store files.

        Returns:
            Dictionary with knowledge store information
        """
        return {
            "total_files": len(self.knowledge_store_files),
            "pdfs_to_feed": len(
                [f for f in self.knowledge_store_files if f.get("feedLlm")]
            ),
            "loaded_files": list(self._loaded_files),
            "loaded_count": len(self._loaded_files),
            "pdf_paths": self.pdf_paths,
        }

    def get_vector_store_info(self) -> Dict:
        """Get information about the current vector store.

        Returns:
            Dictionary with vector store statistics
        """
        if not self._store:
            return {
                "status": "not_initialized",
                "indexed_documents": 0,
                "pdfs_loaded": False,
            }

        try:
            doc_count = len(self._store.docstore._dict)
            return {
                "status": "ready",
                "indexed_documents": doc_count,
                "pdfs_loaded": self._pdfs_loaded,
                "pdf_count": len(self.pdf_paths),
                "loaded_files": list(self._loaded_files),
                "persist_path": self.persist_directory,
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
            }

    def clear_cache(self):
        """Clear all internal caches."""
        self._message_cache.clear()
        self._log("Cleared message cache")

    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics for monitoring.

        Returns:
            Dictionary with cache sizes
        """
        return {
            "message_cache_size": len(self._message_cache),
            "model_cache_size": len(self._model_cache),
            "embedding_cache_size": len(self._embedding_cache),
        }


if __name__ == "__main__":
    from manager import ConfigManager, SessionManager

    chats_path = "./chats.json"
    config_manager = ConfigManager()
    session_manager = SessionManager(chats_path)

    try:
        # Initialize with knowledge store PDFs and auto-save enabled
        llm = Model(config_manager, session_manager, verbose=True, save_chats=True)

        print("\n=== Model Initialized ===")
        print(f"Status: {llm.check()}")
        print(f"Knowledge Store Info: {llm.get_knowledge_store_info()}")
        print(f"Vector Store Info: {llm.get_vector_store_info()}")

        # Create a new chat session
        print("\n=== Creating Chat Session ===")
        session_index = llm.create_chat_session("Research Q&A", tags=["research", "papers"])
        print(f"Created session at index: {session_index}")

        # Example usage with RAG
        if llm.store is not None:
            queries = [
                "What is the main topic of the papers?",
                "What are the key findings?",
            ]

            print("\n=== Processing Queries and Saving to Chat ===")
            for query in queries:
                print(f"\nQuery: {query}")
                
                # Add user query to chat history
                llm.add_to_chat_history("user", query)
                
                # Get LLM response
                response = llm.process(query)  # Auto-retrieves context from PDFs
                print(f"Response: {response}")
                
                # Add assistant response to chat history
                llm.add_to_chat_history("assistant", response)

        # Display chat history
        print("\n=== Chat History ===")
        history = llm.get_chat_history()
        for msg in history:
            role = "User" if not msg.get("is_ai") else "Assistant"
            print(f"[{msg.get('timestamp')}] {role}: {msg.get('message')}")

        # Show session stats
        print("\n=== Session Statistics ===")
        stats = llm.get_session_stats()
        if stats:
            print(f"Total messages: {stats['total_messages']}")
            print(f"User messages: {stats['user_messages']}")
            print(f"AI messages: {stats['ai_messages']}")

        print("\n=== Cache Statistics ===")
        print(llm.get_cache_stats())

        print("\n✓ Chats saved to chats.json")

    except ValueError as e:
        print(f"Error: {e}")
        print("Please configure your API keys in config.json")