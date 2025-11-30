from typing import List, Optional, Any

from pinecone import Pinecone, ServerlessSpec
from langchain_anthropic import ChatAnthropic
from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS, Chroma
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings


class LLM:
    def __init__(self, config_manager: Any = None, model_config: dict = None):
        self.config_manager = config_manager
        self.model_config = model_config or {
            "temperature": 0.7,
            "max_tokens": 2000,
        }
        self.active_model = None
        self.model = None
        self.chat_prompt = self.config_manager.get_chat_prompt() if self.config_manager else ""

    def check(self) -> dict:
        return {"status": self.model is not None, "model": self.active_model}

    def initialize(self, api_key: str = None):
        """Initialize the selected LLM model."""
        # Get API key from config if not provided
        if not api_key and self.config_manager:
            llm_config = self.config_manager.get_llm_config(self.active_model)
            if llm_config:
                api_key = llm_config.get("api_key")

        if not api_key:
            api_key = self.model_config.get("api_key")

        if self.active_model == "xai":
            self.model = ChatOpenAI(
                model=self.model_config.get("model_name", "grok-3"),
                base_url="https://api.x.ai/v1",
                temperature=self.model_config.get("temperature", 0.7),
                max_tokens=self.model_config.get("max_tokens", 2000),
                api_key=api_key,
            )
        elif self.active_model == "google":
            self.model = ChatGoogleGenerativeAI(
                model=self.model_config.get("model_name", "gemini-pro"),
                temperature=self.model_config.get("temperature", 0.7),
                max_output_tokens=self.model_config.get("max_tokens", 2000),
                api_key=api_key,
            )
        elif self.active_model == "openai":
            self.model = ChatOpenAI(
                model=self.model_config.get("model_name", "gpt-4"),
                temperature=self.model_config.get("temperature", 0.7),
                max_tokens=self.model_config.get("max_tokens", 2000),
                api_key=api_key,
            )
        elif self.active_model == "anthropic":
            self.model = ChatAnthropic(
                model=self.model_config.get("model_name", "claude-3-5-sonnet-20241022"),
                temperature=self.model_config.get("temperature", 0.7),
                max_tokens=self.model_config.get("max_tokens", 2000),
                api_key=api_key,
            )
        else:
            raise ValueError(f"Unknown model: {self.active_model}")

    def switch_llm(self, model_name: str, api_key: str = None):
        """Switch to a different LLM provider."""
        self.active_model = model_name
        self.initialize(api_key)

    def update_config(self, new_config: dict):
        """Update configuration parameters."""
        self.model_config.update(new_config)
        if self.model:
            self.initialize()

    def get_chat_prompt(self) -> str:
        return self.config.get("chatPrompt", "")

    def update_chat_prompt(self, new_prompt: str):
        self.config["chatPrompt"] = new_prompt
        self.save_config()

    def process(self, query: str, context: str = "") -> str:
        """Send query (and optional context) to the LLM.

        Args:
            query: The user's query
            context: Optional context from RAG or other sources
        """
        if not self.model:
            raise ValueError("No model initialized. Call switch_llm() first.")

        messages = [SystemMessage(content=self.chat_prompt)]

        # Build user message
        if context:
            user_content = f"Context:\n{context}\n\nQuery: {query}"
        else:
            user_content = query

        messages.append(HumanMessage(content=user_content))

        response = self.model.invoke(messages)
        return response.content


class Embedding:
    def __init__(self, config_manager: Any = None, model_config: dict = None):
        self.config_manager = config_manager
        self.model_config = model_config or {}
        self.active_model = None
        self.model = None

    def check(self) -> dict:
        return {"status": self.model is not None, "model": self.active_model}

    def initialize(self, api_key: str = None):
        """Initialize the selected embedding model."""
        # Get API key from config if not provided
        if not api_key and self.config_manager:
            emb_config = self.config_manager.get_embedding_config(self.active_model)
            if emb_config:
                api_key = emb_config.get("api_key")

        if not api_key:
            api_key = self.model_config.get("api_key")

        if self.active_model == "openai":
            self.model = OpenAIEmbeddings(
                model=self.model_config.get("model_name", "text-embedding-3-small"),
                api_key=api_key,
            )
        elif self.active_model == "google":
            self.model = GoogleGenerativeAIEmbeddings(
                model=self.model_config.get("model_name", "models/embedding-001"),
                api_key=api_key,
            )
        else:
            raise ValueError(f"Unknown embedding model: {self.active_model}")

    def switch_embedding(self, model_name: str, api_key: str = None):
        """Switch to a different embedding provider."""
        self.active_model = model_name
        self.initialize(api_key)

    def update_config(self, new_config: dict):
        """Update configuration parameters."""
        self.model_config.update(new_config)
        if self.model:
            self.initialize()

    def embed(self, text: str) -> List[float]:
        """Generate embeddings for the given text."""
        if not self.model:
            raise ValueError(
                "No embedding model initialized. Call switch_embedding() first."
            )

        return self.model.embed_query(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple documents."""
        if not self.model:
            raise ValueError(
                "No embedding model initialized. Call switch_embedding() first."
            )

        return self.model.embed_documents(texts)


class VectorStore:
    def __init__(self, config_manager: Any = None, store_config: dict = None):
        self.config_manager = config_manager
        self.store_config = store_config or {"backend": "faiss"}
        self.store = None
        self.embedding_function = None
        self.pc_client = None

    def check(self) -> dict:
        return {
            "status": self.store is not None,
            "backend": self.store_config.get("backend"),
            "index_name": (
                self.store_config.get("index_name")
                if self.store_config.get("backend") == "pinecone"
                else None
            ),
        }

    def initialize(self, embedding_function, api_key: str = None):
        """Initialize vector store with embedding function."""
        self.embedding_function = embedding_function
        backend = self.store_config.get("backend", "faiss")

        # Get API key from config if not provided
        if not api_key and self.config_manager and backend == "pinecone":
            store_config = self.config_manager.get_vectorstore_config("Pinecone")
            if store_config:
                api_key = store_config.get("api_key")

        if not api_key and backend == "pinecone":
            api_key = self.store_config.get("api_key")

        if backend == "faiss":
            self._setup_faiss()
        elif backend == "chroma":
            self._setup_chroma()
        elif backend == "pinecone":
            self._setup_pinecone(api_key)
        else:
            raise ValueError(f"Unknown vector store backend: {backend}")

    def _setup_faiss(self):
        """Setup FAISS vector store."""
        pass

    def _setup_chroma(self):
        """Setup Chroma vector store."""
        self.store = Chroma(
            embedding_function=self.embedding_function,
            persist_directory=self.store_config.get("persist_directory", "./chroma_db"),
        )

    def _setup_pinecone(self, api_key: str):
        """Setup Pinecone vector store."""
        if not api_key:
            raise ValueError("Pinecone API key not found.")

        self.pc_client = Pinecone(api_key=api_key)
        index_name = self.store_config.get("index_name", "default-index")

        existing_indexes = [idx.name for idx in self.pc_client.list_indexes()]

        if index_name not in existing_indexes:
            dimension = self.store_config.get("dimension", 1536)
            self.pc_client.create_index(
                name=index_name,
                dimension=dimension,
                metric=self.store_config.get("metric", "cosine"),
                spec=ServerlessSpec(
                    cloud=self.store_config.get("cloud", "aws"),
                    region=self.store_config.get("region", "us-east-1"),
                ),
            )

        self.store = PineconeVectorStore(
            index_name=index_name,
            embedding=self.embedding_function,
            pinecone_api_key=api_key,
        )

    def switch_store(self, backend: str, api_key: str = None):
        """Switch to a different vector store backend."""
        self.store_config["backend"] = backend
        if self.embedding_function:
            self.initialize(self.embedding_function, api_key)

    def update_config(self, new_config: dict):
        """Update configuration parameters."""
        self.store_config.update(new_config)

    def add_documents(self, docs: List[str], metadatas: Optional[List[dict]] = None):
        """Add documents to the vector store."""
        if not self.embedding_function:
            raise ValueError("Embedding function not set. Call initialize() first.")

        documents = [
            Document(page_content=doc, metadata=meta or {})
            for doc, meta in zip(docs, metadatas or [{}] * len(docs))
        ]

        backend = self.store_config.get("backend", "faiss")

        if backend == "faiss":
            if self.store is None:
                self.store = FAISS.from_documents(documents, self.embedding_function)
            else:
                self.store.add_documents(documents)
        elif backend == "chroma":
            self.store.add_documents(documents)
        elif backend == "pinecone":
            self.store.add_documents(documents)

    def retrieve(self, query: str, k: int = 4, filter: dict = None) -> List[str]:
        """Retrieve relevant documents for a query."""
        if not self.store:
            return []

        backend = self.store_config.get("backend", "faiss")

        if backend == "pinecone" and filter:
            docs = self.store.similarity_search(query, k=k, filter=filter)
        else:
            docs = self.store.similarity_search(query, k=k)

        return [doc.page_content for doc in docs]

    def retrieve_with_scores(self, query: str, k: int = 4) -> List[tuple]:
        """Retrieve documents with similarity scores."""
        if not self.store:
            return []

        results = self.store.similarity_search_with_score(query, k=k)
        return [(doc.page_content, score) for doc, score in results]

    def save(self, path: str = None):
        """Save the vector store to disk (FAISS only)."""
        backend = self.store_config.get("backend", "faiss")

        if backend == "faiss" and self.store:
            save_path = path or self.store_config.get(
                "persist_directory", "./faiss_index"
            )
            self.store.save_local(save_path)
        elif backend == "chroma":
            print("Chroma auto-persists. No manual save needed.")
        elif backend == "pinecone":
            print("Pinecone is cloud-based. Data is automatically persisted.")

    def load(self, path: str = None):
        """Load the vector store from disk (FAISS only)."""
        if not self.embedding_function:
            raise ValueError("Embedding function not set. Call initialize() first.")

        backend = self.store_config.get("backend", "faiss")

        if backend == "faiss":
            load_path = path or self.store_config.get(
                "persist_directory", "./faiss_index"
            )
            self.store = FAISS.load_local(
                load_path, self.embedding_function, allow_dangerous_deserialization=True
            )
        else:
            print(f"Load not applicable for {backend} backend.")

    def delete_index(self):
        """Delete the Pinecone index (Pinecone only)."""
        backend = self.store_config.get("backend", "faiss")

        if backend == "pinecone" and self.pc_client:
            index_name = self.store_config.get("index_name", "default-index")
            self.pc_client.delete_index(index_name)
            self.store = None
            print(f"Deleted Pinecone index: {index_name}")
        else:
            print("Delete index only available for Pinecone backend.")
