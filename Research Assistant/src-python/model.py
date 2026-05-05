import hashlib
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from langchain_anthropic import ChatAnthropic
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage

from manager import ConfigManager, SessionManager

from lib.utils import extract_content

logger = logging.getLogger(__name__)


class Model:

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
            verbose: Enable detailed logging (sets log level to DEBUG)
            save_chats: Enable automatic chat saving to file
        """
        self.config_manager = config_manager
        self.session_manager = session_manager
        
        if verbose:
            logger.setLevel(logging.DEBUG)

        self._model_cache: Dict[str, Any] = {}
        self._embedding_cache: Dict[str, Any] = {}
        self._message_cache: Dict[str, List[BaseMessage]] = {}

        self.basic_config = self.config_manager.get_basic_config()
        self._prepare_model()

        self.project_path = self.basic_config.get("projectPath", "./")
        self.persist_directory = os.path.join(self.project_path, "vector_store")

        self.knowledge_store_files = self.config_manager.get_knowledge_store_files()
        self.pdf_paths = self._extract_pdf_paths()

        self._pdfs_loaded = False
        self._loaded_files: set = set()

        logger.debug(
            f"Initializing Model with {len(self.pdf_paths)} PDF(s) from knowledge store"
        )

        self._embedding = self._initialize_embedding()
        self._llm = self._initialize_llm()
        self._store = None

        self._initialize_vector_store(use_cached_store=use_cached_store)

    # ── Private helpers ───────────────────────────────────────────────────────

    def _extract_pdf_paths(self) -> List[str]:
        """Extract PDF file paths from knowledge store config."""
        pdf_paths = []
        for file_info in self.knowledge_store_files:
            if not file_info.get("feedLlm", False):
                logger.debug(f"Skipping {file_info.get('fileName')} (feedLlm=False)")
                continue
            if file_info.get("fileType", "").lower() != "pdf":
                logger.debug(f"Skipping {file_info.get('fileName')} (not PDF)")
                continue
            file_path = file_info.get("filePath")
            if file_path and os.path.exists(file_path):
                pdf_paths.append(file_path)
                logger.debug(f"Found PDF: {file_info.get('fileName')} at {file_path}")
            else:
                logger.warning(f"PDF not found at path: {file_path}")
        return pdf_paths

    def _initialize_vector_store(self, use_cached_store: bool = True) -> None:
        if use_cached_store and self._load_cached_store():
            logger.debug(f"Loaded vector store from cache: {self.persist_directory}")
            self._pdfs_loaded = True
            return

        if self.pdf_paths:
            logger.debug(f"Loading {len(self.pdf_paths)} PDF(s) from knowledge store...")
            documents = self._load_pdfs()
            if documents:
                logger.debug(f"Building vector store from {len(documents)} documents...")
                self._build_vector_store_from_documents(documents)
                self._pdfs_loaded = True
            else:
                logger.warning("No documents extracted from PDFs")
                self._store = None
        else:
            logger.debug("No PDFs in knowledge store. Vector store will be empty.")
            self._store = None

    def _load_pdfs(self) -> List[Document]:
        all_documents = []
        for pdf_path in self.pdf_paths:
            if not os.path.exists(pdf_path):
                logger.warning(f"PDF file not found: {pdf_path}")
                continue
            try:
                file_name = os.path.basename(pdf_path)
                loader = PyPDFLoader(pdf_path)
                documents = loader.load()
                for doc in documents:
                    doc.metadata["source_pdf"] = file_name
                    doc.metadata["source_path"] = pdf_path
                all_documents.extend(documents)
                self._loaded_files.add(file_name)
                logger.debug(f"Extracted {len(documents)} pages from {file_name}")
            except Exception as e:
                logger.error(f"Error loading PDF {pdf_path}: {e}")
        return all_documents

    def _build_vector_store_from_documents(self, documents: List[Document]) -> None:
        try:
            self._store = FAISS.from_documents(documents, self._embedding)
        except Exception as e:
            logger.error(f"Error building vector store: {e}")
            self._store = None

    def _load_cached_store(self) -> bool:
        if not os.path.exists(self.persist_directory):
            return False
        try:
            self._store = FAISS.load_local(
                self.persist_directory,
                self._embedding,
                allow_dangerous_deserialization=True,
            )
            return True
        except Exception as e:
            logger.warning(f"Could not load cached vector store: {e}")
            return False

    def _get_model_cache_key(self, model_type: str) -> str:
        """Generate a cache key for LLM instances.

        FIX: the old _get_model_key() stored the raw API key in the dict key.
        If anything serialized or logged _model_cache, the key would leak.
        Use a short hash of the API key instead — still unique, not sensitive.
        """
        key_hash = hashlib.sha256((getattr(self, "api_key", None) or "").encode()).hexdigest()[:16]
        return f"{self.active_llm_provider}_{model_type}_{key_hash}"

    def _initialize_llm(self):
        
        """Initialize LLM with instance-level caching."""
        if not self.api_key:
            raise ValueError(
                f"No API key configured for {self.active_llm_provider}. "
                f"Please add your API key to config.json under "
                f"llmConfig.{self.active_llm_provider}.apiKey"
            )

        cache_key = self._get_model_cache_key("llm")
        if cache_key in self._model_cache:
            return self._model_cache[cache_key]

        model_config = {
            "model":       self.model,
            "temperature": self.temperature,
            "max_tokens":  self.max_tokens,
            "api_key":     self.api_key,
        }

        try:
            if self.active_llm_provider == "google":
                llm = ChatGoogleGenerativeAI(**model_config)
            elif self.active_llm_provider == "openai":
                llm = ChatOpenAI(**model_config)
            elif self.active_llm_provider == "anthropic":
                llm = ChatAnthropic(**model_config)
            else:
                raise ValueError(
                    f"Unknown LLM provider: '{self.active_llm_provider}'. "
                    f"Supported: 'google', 'openai', 'anthropic'."
                )
        except ValueError:
            raise
        except Exception as e:
            raise RuntimeError(
                f"Failed to initialize '{self.active_llm_provider}' LLM. "
                f"Check your API key and model name in config.json.\n"
                f"Details: {e}"
            ) from e

        self._model_cache[cache_key] = llm
        return llm

    def _initialize_embedding(self):
        """Initialize embedding model with instance-level caching.

        FIX: the old cache key used _get_model_key() which included the API
        key — but HuggingFaceEmbeddings doesn't use an API key at all. Using
        the API key in the key meant a new embedding instance was created on
        every provider switch even though the model is identical. Fixed to a
        stable key based only on the model name.
        """
        cache_key = "huggingface_all-MiniLM-L6-v2"
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        embedding = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
        )
        self._embedding_cache[cache_key] = embedding
        return embedding

    def _prepare_model(self) -> None:
        self.ai_config = self.config_manager.get_ai_config()
        self.active_llm_provider = self.basic_config.get("activeLlmProvider")
        self.model = self.ai_config.get("model")
        self.temperature = self.ai_config.get("temperature")
        self.max_tokens = self.ai_config.get("maxTokens")
        self.chat_prompt = self.ai_config.get("chatPrompt")
        raw_api_key = self.ai_config.get("apiKey", "")
        self.api_key = raw_api_key.strip() if raw_api_key else None

    def _build_messages(self, query: str, context: str = "") -> List[BaseMessage]:
        """Build message list with caching to avoid rebuilding identical prompts.

        FIX: returns a copy of the cached list so callers cannot mutate the
        cached value. The old code returned the same list object that was stored
        in the cache — any caller that appended to or modified the list would
        silently corrupt the cache for all future calls with the same key.
        """
        cache_key = hashlib.md5(
            f"{self.chat_prompt}\x00{query}\x00{context}".encode()
        ).hexdigest()

        if cache_key in self._message_cache:
            return list(self._message_cache[cache_key])  # return a copy

        messages: List[BaseMessage] = [SystemMessage(content=self.chat_prompt)]
        if context:
            user_content = f"Context:\n{context}\n\nQuery: {query}"
        else:
            user_content = query
        messages.append(HumanMessage(content=user_content))

        self._message_cache[cache_key] = messages
        return list(messages)  # return a copy, keep original in cache

    def _get_llm_without_thinking(self):
        """Return an LLM variant with thinking/reasoning disabled (Google only)."""
        if self.active_llm_provider == "google":
            return ChatGoogleGenerativeAI(
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                api_key=self.api_key,
                thinking_budget=0,
            )
        return self._llm

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def llm(self):
        return self._llm

    @property
    def embedding(self):
        return self._embedding

    @property
    def store(self):
        return self._store

    @store.setter
    def store(self, value):
        self._store = value

    # ── Public API ────────────────────────────────────────────────────────────

    def check(self) -> dict:
        """Check if model is properly initialized."""
        return {
            "status": self._llm is not None,
            "model": self.active_llm_provider,
            "vector_store_ready": self._store is not None,
            "pdfs_loaded": self._pdfs_loaded,
            "pdf_count": len(self.pdf_paths),
            "loaded_files": list(self._loaded_files),
        }

    def switch_llm(self, llm_provider: str) -> None:
        """Switch to a different LLM provider.

        FIX: the old code mutated config_manager.config["basicConfig"] directly —
        bypassing ConfigManager's interface with no validation and no save.
        Use the proper setter so the change is encapsulated and persisted.
        """
        if llm_provider == self.active_llm_provider:
            return

        # Use ConfigManager's interface rather than direct dict mutation
        self.config_manager.set_active_llm_provider(llm_provider)

        self._prepare_model()
        self._embedding = self._initialize_embedding()
        self._llm = self._initialize_llm()
        self._message_cache.clear()
        logger.info(f"Switched LLM to {llm_provider}")

    def process(self, query: str, context: str = "", use_context: bool = True) -> str:
        """Process a query with optional context.

        Args:
            query: User query
            context: Optional explicit context (overrides auto-retrieval)
            use_context: Whether to auto-retrieve context from vector store

        Returns:
            LLM response string
        """
        if not self.api_key:
            raise ValueError(
                f"No API key configured for {self.active_llm_provider}. "
                f"Set it in config.json."
            )

        if not context and use_context and self._store is not None:
            retrieved_docs = self.retrieve(query, k=3)
            if retrieved_docs:
                context = "\n\n".join(retrieved_docs)
                logger.debug(f"Retrieved {len(retrieved_docs)} documents for context")

        messages = self._build_messages(query, context)
        response = self._llm.invoke(messages)
        return extract_content(response.content)

    def embed(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not text or not text.strip():
            raise ValueError("Cannot embed empty text")
        return self._embedding.embed_query(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        texts = [t for t in texts if t and t.strip()]
        if not texts:
            return []
        return self._embedding.embed_documents(texts)

    def add_documents(
        self,
        docs: List[str],
        metadatas: Optional[List[dict]] = None,
    ) -> None:
        """Add documents to the vector store.

        FIX: the old code called self.save() on every add_documents() call.
        If called in a loop or from _build_vector_store_from_documents during
        init, this caused N redundant disk writes. Callers are now responsible
        for saving when they're ready.

        Args:
            docs: List of document texts
            metadatas: Optional list of metadata dicts
        """
        if metadatas and len(metadatas) != len(docs):
            raise ValueError(f"docs ({len(docs)}) and metadatas ({len(metadatas)}) must be same length")

        filtered: List[tuple] = [
            (doc, meta)
            for doc, meta in zip(docs, metadatas or [{}] * len(docs))
            if doc and doc.strip()
        ]

        skipped = len(docs) - len(filtered)
        if skipped:
            logger.warning(f"Skipped {skipped} empty document(s)")

        if not filtered:
            return

        documents = [
            Document(page_content=doc, metadata=meta or {})
            for doc, meta in filtered
        ]

        if self._store is None:
            self._store = FAISS.from_documents(documents, self._embedding)
        else:
            self._store.add_documents(documents)

        logger.debug(f"Added {len(filtered)} documents to vector store")

    def retrieve(self, query: str, k: int = 4) -> List[str]:
        """Retrieve relevant documents for a query."""
        if not self._store:
            return []
        docs = self._store.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]

    def retrieve_with_scores(self, query: str, k: int = 4) -> List[Tuple[str, float]]:
        """Retrieve documents with similarity scores."""
        if not self._store:
            return []
        results = self._store.similarity_search_with_score(query, k=k)
        return [(doc.page_content, score) for doc, score in results]

    def retrieve_with_metadata(self, query: str, k: int = 4) -> List[Dict]:
        """Retrieve documents with metadata and scores."""
        if not self._store:
            return []
        results = self._store.similarity_search_with_score(query, k=k)
        return [
            {"content": doc.page_content, "score": score, "metadata": doc.metadata}
            for doc, score in results
        ]

    def batch_retrieve(self, queries: List[str], k: int = 4) -> List[List[str]]:
        """Retrieve documents for multiple queries."""
        if not self._store:
            return [[] for _ in queries]
        return [self.retrieve(q, k) for q in queries]

    def save(self) -> None:
        """Save the vector store to disk."""
        if self._store is not None:
            try:
                os.makedirs(self.persist_directory, exist_ok=True)
                self._store.save_local(self.persist_directory)
                logger.debug(f"Vector store saved to {self.persist_directory}")
            except Exception as e:
                logger.error(f"Error saving vector store: {e}")

    def load(self) -> None:
        """Load the vector store from disk."""
        try:
            self._store = FAISS.load_local(
                self.persist_directory,
                self._embedding,
                allow_dangerous_deserialization=True,
            )
            logger.debug(f"Vector store loaded from {self.persist_directory}")
        except Exception as e:
            logger.warning(f"Could not load vector store: {e}")
            self._store = None

    def clear_cache(self) -> None:
        """Clear the message cache."""
        self._message_cache.clear()
        logger.debug("Cleared message cache")

    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache sizes for monitoring."""
        return {
            "message_cache_size":   len(self._message_cache),
            "model_cache_size":     len(self._model_cache),
            "embedding_cache_size": len(self._embedding_cache),
        }

    def get_knowledge_store_info(self) -> Dict:
        """Get information about knowledge store files."""
        return {
            "total_files":   len(self.knowledge_store_files),
            "pdfs_to_feed":  len([f for f in self.knowledge_store_files if f.get("feedLlm")]),
            "loaded_files":  list(self._loaded_files),
            "loaded_count":  len(self._loaded_files),
            "pdf_paths":     self.pdf_paths,
        }

    def get_vector_store_info(self) -> Dict:
        """Get information about the current vector store."""
        if not self._store:
            return {
                "status": "not_initialized",
                "indexed_documents": 0,
                "pdfs_loaded": False,
            }
        try:
            doc_count = self._store.index.ntotal
            return {
                "status":            "ready",
                "indexed_documents": doc_count,
                "pdfs_loaded":       self._pdfs_loaded,
                "pdf_count":         len(self.pdf_paths),
                "loaded_files":      list(self._loaded_files),
                "persist_path":      self.persist_directory,
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}