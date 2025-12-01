from typing import List, Optional, Any

from langchain_anthropic import ChatAnthropic
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS, Chroma
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
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
        self.chat_prompt = (
            self.config_manager.get_chat_prompt() if self.config_manager else ""
        )

    def check(self) -> dict:
        return {"status": self.model is not None, "model": self.active_model}

    def initialize(self, api_key: str = None):
        """Initialize the selected LLM model."""
        if not self.active_model:
            raise ValueError("No active model set. Call switch_llm() first.")

        # Get API key from config if not provided
        if not api_key and self.config_manager:
            llm_config = self.config_manager.get_llm_config(self.active_model)
            if llm_config:
                api_key = llm_config.get("api_key")
                # Merge config from file with model_config
                self.model_config.update(
                    {
                        k: v
                        for k, v in llm_config.items()
                        if k not in self.model_config or self.model_config[k] is None
                    }
                )

        if not api_key:
            api_key = self.model_config.get("api_key")

        if not api_key:
            raise ValueError(f"No API key found for {self.active_model}")

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

        # Update active status in config
        if self.config_manager:
            config = self.config_manager.get()
            if "llmConfig" in config and self.active_model in config["llmConfig"]:
                config["llmConfig"][self.active_model]["active"] = True
                self.config_manager.save()

    def switch_llm(self, model_name: str, api_key: str = None):
        """Switch to a different LLM provider."""
        # Deactivate current model
        if self.config_manager and self.active_model:
            config = self.config_manager.get()
            if "llmConfig" in config:
                # Deactivate all models
                for model in config["llmConfig"]:
                    config["llmConfig"][model]["active"] = False

        # Set new active model
        self.active_model = model_name

        # Initialize new model
        self.initialize(api_key)

    def get_chat_prompt(self) -> str:
        """Get the current chat prompt."""
        return self.chat_prompt

    def update_chat_prompt(self, new_prompt: str):
        """Update the chat prompt."""
        self.chat_prompt = new_prompt

        if self.config_manager:
            config = self.config_manager.get()
            config["chatPrompt"] = new_prompt
            self.config_manager.save()

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
        if not self.active_model:
            raise ValueError("No active model set. Call switch_embedding() first.")

        # Get API key from config if not provided
        if not api_key and self.config_manager:
            emb_config = self.config_manager.get_embedding_config(self.active_model)
            if emb_config:
                api_key = emb_config.get("api_key")
                # Merge config from file with model_config
                self.model_config.update(
                    {
                        k: v
                        for k, v in emb_config.items()
                        if k not in self.model_config or self.model_config[k] is None
                    }
                )

        if not api_key:
            api_key = self.model_config.get("api_key")

        if not api_key:
            raise ValueError(f"No API key found for {self.active_model}")

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
        elif self.active_model == "huggingface":
            self.model = HuggingFaceEmbeddings(
                model_name=self.model_config.get(
                    "model_name", "sentence-transformers/all-mpnet-base-v2"
                ),
            )
        else:
            raise ValueError(f"Unknown embedding model: {self.active_model}")

        # Update active status in config
        if self.config_manager:
            config = self.config_manager.get()
            if (
                "embeddingsConfig" in config
                and self.active_model in config["embeddingsConfig"]
            ):
                config["embeddingsConfig"][self.active_model]["active"] = True
                self.config_manager.save()

    def switch_embedding(self, model_name: str, api_key: str = None):
        """Switch to a different embedding provider."""
        # Deactivate current model
        if self.config_manager and self.active_model:
            config = self.config_manager.get()
            if "embeddingsConfig" in config:
                # Deactivate all models
                for model in config["embeddingsConfig"]:
                    config["embeddingsConfig"][model]["active"] = False

        # Set new active model
        self.active_model = model_name

        # Initialize new model
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
        self.active_backend = None
        self.store = None
        self.embedding_function = None
        self.pc_client = None

    def check(self) -> dict:
        return {
            "status": self.store is not None,
            "backend": self.active_backend,
        }

    def initialize(self, embedding_function, backend: str = None, api_key: str = None):
        """Initialize vector store with embedding function."""
        self.embedding_function = embedding_function

        if backend:
            self.active_backend = backend
        elif not self.active_backend:
            self.active_backend = self.store_config.get("backend", "faiss")

        if self.active_backend == "faiss":
            self._setup_faiss()
        elif self.active_backend == "chroma":
            self._setup_chroma()
        else:
            raise ValueError(f"Unknown vector store backend: {self.active_backend}")

        # Update active status in config
        if self.config_manager:
            config = self.config_manager.get()
            if (
                "vectorStoreConfig" in config
                and self.active_backend in config["vectorStoreConfig"]
            ):
                config["vectorStoreConfig"][self.active_backend]["active"] = True
                self.config_manager.save()

    def _setup_faiss(self):
        """Setup FAISS vector store."""
        pass

    def _setup_chroma(self):
        """Setup Chroma vector store."""
        self.store = Chroma(
            embedding_function=self.embedding_function,
            persist_directory=self.store_config.get("persist_directory", "./chroma_db"),
        )

    def switch_store(self, backend: str, api_key: str = None):
        """Switch to a different vector store backend."""
        # Deactivate current backend
        if self.config_manager and self.active_backend:
            config = self.config_manager.get()
            if "vectorStoreConfig" in config:
                # Deactivate all backends
                for store in config["vectorStoreConfig"]:
                    config["vectorStoreConfig"][store]["active"] = False

        # Set new backend
        self.active_backend = backend
        self.store_config["backend"] = backend

        # Initialize new backend
        if self.embedding_function:
            self.initialize(self.embedding_function, backend, api_key)

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

        if self.active_backend == "faiss":
            if self.store is None:
                self.store = FAISS.from_documents(documents, self.embedding_function)
            else:
                self.store.add_documents(documents)
        elif self.active_backend == "chroma":
            self.store.add_documents(documents)

    def retrieve(self, query: str, k: int = 4) -> List[str]:
        """Retrieve relevant documents for a query."""
        if not self.store:
            return []

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
        if self.active_backend == "faiss" and self.store:
            save_path = path or self.store_config.get(
                "persist_directory", "./faiss_index"
            )
            self.store.save_local(save_path)
        elif self.active_backend == "chroma":
            print("Chroma auto-persists. No manual save needed.")

    def load(self, path: str = None):
        """Load the vector store from disk (FAISS only)."""
        if not self.embedding_function:
            raise ValueError("Embedding function not set. Call initialize() first.")

        if self.active_backend == "faiss":
            load_path = path or self.store_config.get(
                "persist_directory", "./faiss_index"
            )
            self.store = FAISS.load_local(
                load_path, self.embedding_function, allow_dangerous_deserialization=True
            )
        else:
            print(f"Load not applicable for {self.active_backend} backend.")
