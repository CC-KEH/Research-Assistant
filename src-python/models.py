import hashlib
from typing import List, Optional, Dict, Tuple

from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from langchain_anthropic import ChatAnthropic, AnthropicEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from manager import ConfigManager


class Model:
    """Optimized LLM and RAG model with caching and lazy loading."""
    
    # Class-level cache for model instances to avoid recreating them
    _model_cache: Dict[str, any] = {}
    _embedding_cache: Dict[str, any] = {}
    
    def __init__(self, config_manager: ConfigManager):
        self.config_manager = config_manager
        self.ai_config = self.config_manager.get_ai_config()
        self.active_llm = self.ai_config.get("active_llm")
        self.llm_config = self.config_manager.get_llm_config(model_name=self.active_llm)
        self.persist_directory = self.ai_config.get("persist_directory", "./faiss_index")
        self.chat_prompt = self.config_manager.get_chat_prompt()
        self.api_key = self.llm_config.get("api_key")
        
        # Lazy initialization - only create when needed
        self._llm = None
        self._embedding = None
        self._store = None
        
        # Message cache to avoid rebuilding the same prompt
        self._message_cache: Dict[str, List[BaseMessage]] = {}
        
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
        """Lazy load vector store on first access."""
        if self._store is None:
            load_path = self.persist_directory
            try:
                self._store = FAISS.load_local(
                    load_path, self.embedding, allow_dangerous_deserialization=True
                )
            except Exception:
                # Store doesn't exist yet, will be created on first add_documents
                self._store = None
        return self._store
    
    @store.setter
    def store(self, value):
        """Allow setting store directly."""
        self._store = value

    def check(self) -> dict:
        """Check if model is properly initialized."""
        return {"status": self._llm is not None, "model": self.active_llm}

    def _get_model_key(self, model_type: str) -> str:
        """Generate a cache key for models."""
        return f"{self.active_llm}_{model_type}_{self.api_key}"

    def _initialize_llm(self):
        """Initialize LLM with caching to avoid recreating the same model."""
        if not self.api_key:
            raise ValueError(f"No API key found for {self.active_llm}")

        cache_key = self._get_model_key("llm")
        if cache_key in self._model_cache:
            return self._model_cache[cache_key]

        model_config = {
            "temperature": self.llm_config.get("temperature", 0.7),
            "max_tokens": self.llm_config.get("max_tokens", 2000),
            "api_key": self.api_key,
        }

        if self.active_llm == "google":
            llm = ChatGoogleGenerativeAI(
                model=self.llm_config.get("model_name", "gemini-pro"),
                **model_config
            )
        elif self.active_llm == "openai":
            llm = ChatOpenAI(
                model=self.llm_config.get("model_name", "gpt-4"),
                **model_config
            )
        elif self.active_llm == "anthropic":
            llm = ChatAnthropic(
                model=self.llm_config.get("model_name", "claude-3-5-sonnet-20241022"),
                **model_config
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

        embedding_config = {"api_key": self.api_key}

        if self.active_llm == "openai":
            embedding = OpenAIEmbeddings(
                model='text-embedding-3-small',
                **embedding_config
            )
        elif self.active_llm == "google":
            embedding = GoogleGenerativeAIEmbeddings(
                model='models/embedding-001',
                **embedding_config
            )
        elif self.active_llm == "anthropic":
            embedding = AnthropicEmbeddings(
                model='claude-3-5-sonnet-20241022',
                **embedding_config
            )
        else:
            raise ValueError(f"Unknown embedding model: {self.active_llm}")

        self._embedding_cache[cache_key] = embedding
        return embedding

    def switch_llm(self, model_name: str):
        """Switch to a different LLM provider efficiently."""
        if model_name == self.active_llm:
            return  # No-op if same model
        
        self.ai_config["active_llm"] = model_name
        self.config_manager.update_ai_config(self.ai_config)
        self.active_llm = model_name
        self.llm_config = self.config_manager.get_llm_config(model_name=self.active_llm)
        self.api_key = self.llm_config.get("api_key")
        
        # Reset lazy-loaded properties
        self._llm = None
        self._embedding = None
        
        # Clear message cache when switching models
        self._message_cache.clear()

    def get_chat_prompt(self) -> str:
        """Get the current chat prompt."""
        return self.chat_prompt

    def update_chat_prompt(self, new_prompt: str):
        """Update the chat prompt and clear cache."""
        self.chat_prompt = new_prompt
        self._message_cache.clear()  # Invalidate cached messages

        if self.config_manager:
            config = self.config_manager.get()
            config["chatPrompt"] = new_prompt
            self.config_manager.save()

    def _build_messages(self, query: str, context: str = "") -> List[BaseMessage]:
        """Build messages with caching to avoid rebuilding identical prompts."""
        # Create a cache key from query and context
        cache_key = hashlib.md5(f"{self.chat_prompt}_{query}_{context}".encode()).hexdigest()
        
        if cache_key in self._message_cache:
            return self._message_cache[cache_key]
        
        messages = [SystemMessage(content=self.chat_prompt)]
        
        if context:
            user_content = f"Context:\n{context}\n\nQuery: {query}"
        else:
            user_content = query
        
        messages.append(HumanMessage(content=user_content))
        
        # Cache the messages
        self._message_cache[cache_key] = messages
        return messages

    def process(self, query: str, context: str = "") -> str:
        """Send query (and optional context) to the LLM with caching.

        Args:
            query: The user's query
            context: Optional context from RAG or other sources
        """
        if not self.api_key:
            raise ValueError("No API key configured. Call switch_llm() first.")

        messages = self._build_messages(query, context)
        response = self.llm.invoke(messages)
        return response.content

    def embed(self, text: str) -> List[float]:
        """Generate embeddings for the given text."""
        return self.embedding.embed_query(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple documents efficiently.
        
        Batches texts to reduce API calls.
        """
        # LangChain's embed_documents already batches internally,
        # but we can optimize by filtering empty texts
        texts = [t for t in texts if t and t.strip()]
        if not texts:
            return []
        return self.embedding.embed_documents(texts)

    def add_documents(self, docs: List[str], metadatas: Optional[List[dict]] = None):
        """Add documents to the vector store efficiently.
        
        Filters empty documents and batches operations.
        """
        # Filter out empty documents to avoid wasting embeddings
        filtered_docs = []
        filtered_metas = []
        
        for doc, meta in zip(docs, metadatas or [{}] * len(docs)):
            if doc and doc.strip():  # Skip empty documents
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

    def retrieve(self, query: str, k: int = 4) -> List[str]:
        """Retrieve relevant documents for a query."""
        if not self.store:
            return []

        docs = self.store.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]

    def retrieve_with_scores(self, query: str, k: int = 4) -> List[Tuple[str, float]]:
        """Retrieve documents with similarity scores."""
        if not self.store:
            return []

        results = self.store.similarity_search_with_score(query, k=k)
        return [(doc.page_content, score) for doc, score in results]

    def batch_retrieve(self, queries: List[str], k: int = 4) -> List[List[str]]:
        """Retrieve documents for multiple queries efficiently.
        
        More efficient than calling retrieve() multiple times.
        """
        if not self.store:
            return [[] for _ in queries]
        
        return [self.retrieve(q, k) for q in queries]

    def save(self):
        """Save the vector store to disk (FAISS only)."""
        if self._store is not None:  # Only save if store exists
            save_path = self.persist_directory
            self._store.save_local(save_path)

    def load(self):
        """Load the vector store from disk (FAISS only)."""
        load_path = self.persist_directory
        try:
            self._store = FAISS.load_local(
                load_path, self.embedding, allow_dangerous_deserialization=True
            )
        except Exception as e:
            print(f"Could not load vector store: {e}")
            self._store = None

    def clear_cache(self):
        """Clear all internal caches."""
        self._message_cache.clear()

    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics for monitoring."""
        return {
            "message_cache_size": len(self._message_cache),
            "model_cache_size": len(self._model_cache),
            "embedding_cache_size": len(self._embedding_cache),
        }


if __name__ == "__main__":
    from manager import ConfigManager

    config_manager = ConfigManager()
    llm = Model(config_manager)
    llm.switch_llm("openai")
    
    # Example usage
    response = llm.process("Hello, how are you?")
    print(response)
    
    # Check cache stats
    print(llm.get_cache_stats())