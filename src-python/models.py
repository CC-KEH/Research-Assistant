from typing import List, Optional

import faiss
from langchain_xai import ChatXAI
from langchain_anthropic import ChatAnthropic
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS, Chroma
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from manager import *


class LLM:
    def __init__(self, config_manager: ConfigManager):
        self.config_manager = config_manager
        self.ai_config = self.config_manager.get_ai_config()
        self.active_llm = self.ai_config.get("active_llm")
        self.llm_config = self.config_manager.get_llm_config(model_name=self.active_llm)
        self.chat_prompt = self.config_manager.get_chat_prompt()
        self.model = self.initialize()

    def check(self) -> dict:
        return {"status": self.model is not None, "model": self.active_llm}

    def initialize(self):
        api_key = self.llm_config.get("api_key")

        if not api_key:
            raise ValueError(f"No API key found for {self.active_llm}")

        if self.active_llm == "xai":
            self.model = ChatXAI(
                model=self.llm_config.get("model_name", "grok-3"),
                temperature=self.llm_config.get("temperature", 0.7),
                max_tokens=self.llm_config.get("max_tokens", 2000),
                api_key=api_key,
            )
        elif self.active_llm == "google":
            self.model = ChatGoogleGenerativeAI(
                model=self.llm_config.get("model_name", "gemini-pro"),
                temperature=self.llm_config.get("temperature", 0.7),
                max_tokens=self.llm_config.get("max_tokens", 2000),
                api_key=api_key,
            )
        elif self.active_llm == "openai":
            self.model = ChatOpenAI(
                model=self.llm_config.get("model_name", "gpt-4"),
                temperature=self.llm_config.get("temperature", 0.7),
                max_tokens=self.llm_config.get("max_tokens", 2000),
                api_key=api_key,
            )
        elif self.active_llm == "anthropic":
            self.model = ChatAnthropic(
                model=self.llm_config.get("model_name", "claude-3-5-sonnet-20241022"),
                temperature=self.llm_config.get("temperature", 0.7),
                max_tokens=self.llm_config.get("max_tokens", 2000),
                api_key=api_key,
            )
        else:
            raise ValueError(f"Unknown model: {self.active_llm}")
        
        return self.model  # FIX: Return the model

    def switch_llm(self, model_name: str):
        """Switch to a different LLM provider."""
        self.ai_config["active_llm"] = model_name  # FIX: Use direct assignment instead of setdefault
        self.config_manager.update_ai_config(self.ai_config)
        self.active_llm = model_name
        self.llm_config = self.config_manager.get_llm_config(model_name=self.active_llm)  # FIX: Update llm_config
        self.model = self.initialize()  # FIX: Assign return value

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
    def __init__(self, config_manager: ConfigManager):
        self.config_manager = config_manager
        self.ai_config = self.config_manager.get_ai_config()
        self.active_embedding = self.ai_config.get("active_embedding")
        self.model = self.initialize()

    def check(self) -> dict:
        return {"status": self.model is not None, "model": self.active_embedding}

    def initialize(self):
        self.embedding_config = self.config_manager.get_embedding_config(
            model_name=self.active_embedding
        )
        api_key = self.embedding_config.get("api_key")

        # FIX: Only check for API key when needed (not for HuggingFace)
        if self.active_embedding in ["openai", "google"] and not api_key:
            raise ValueError(f"No API key found for {self.active_embedding}")

        if self.active_embedding == "openai":
            self.model = OpenAIEmbeddings(
                model=self.embedding_config.get("model_name", "text-embedding-3-small"),
                api_key=api_key,
            )
        elif self.active_embedding == "google":
            self.model = GoogleGenerativeAIEmbeddings(
                model=self.embedding_config.get("model_name", "models/embedding-001"),
                api_key=api_key,
            )
        elif self.active_embedding == "huggingface":
            self.model = HuggingFaceEmbeddings(
                model_name=self.embedding_config.get(
                    "model_name",
                    "BAAI/bge-small-en-v1.5",
                ),
            )
        else:
            raise ValueError(f"Unknown embedding model: {self.active_embedding}")
        
        return self.model  # FIX: Return the model

    def switch_embedding(self, model_name: str):
        self.ai_config["active_embedding"] = model_name  # FIX: Use direct assignment
        self.config_manager.update_ai_config(self.ai_config)
        self.active_embedding = model_name
        self.model = self.initialize()  # FIX: Assign return value

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
    def __init__(self, config_manager: ConfigManager, embedding_model: Embedding):
        self.config_manager = config_manager
        self.ai_config = self.config_manager.get_ai_config()
        self.embedding_model = embedding_model.model
        self.active_vector_store = self.ai_config.get("active_vector_store")
        self.store_config = self.config_manager.get_vectorstore_config(
            model_name=self.active_vector_store
        )
        self.store = self.initialize()

    def check(self) -> dict:
        return {
            "status": self.store is not None,
            "backend": self.active_vector_store,
        }

    def initialize(self):
        """Initialize vector store with embedding function."""
        if self.active_vector_store == "faiss":
            self._setup_faiss()
        elif self.active_vector_store == "chroma":
            self._setup_chroma()
        else:
            raise ValueError(
                f"Unknown vector store backend: {self.active_vector_store}"
            )
        
        return self.store  # FIX: Return the store

    def _setup_faiss(self, embedding_dimension: int):
        """Setup FAISS vector store."""
        # FIX: Use a dummy text to get proper embedding dimension
        # embedding_dim = len(self.embedding_model.embed_query(""))
        embedding_dim = embedding_dimension
        index = faiss.IndexFlatL2(embedding_dim)
        self.store = FAISS(
            embedding_function=self.embedding_model,
            index=index,
            docstore=InMemoryDocstore(),
            index_to_docstore_id={},
        )

    def _setup_chroma(self):
        """Setup Chroma vector store."""
        self.store = Chroma(
            collection_name="chroma_collection",
            embedding_function=self.embedding_model,
            persist_directory=self.store_config.get("persist_directory", "./chroma_db"),
        )

    def switch_store(self, model_name: str):
        """Switch to a different vector store backend."""
        self.ai_config["active_vector_store"] = model_name  # FIX: Use direct assignment
        self.config_manager.update_ai_config(self.ai_config)
        self.active_vector_store = model_name
        self.store_config = self.config_manager.get_vectorstore_config(
            model_name=self.active_vector_store
        )  # FIX: Update store_config
        self.store = self.initialize()  # FIX: Assign return value

    def add_documents(self, docs: List[str], metadatas: Optional[List[dict]] = None):
        """Add documents to the vector store."""
        documents = [
            Document(page_content=doc, metadata=meta or {})
            for doc, meta in zip(docs, metadatas or [{}] * len(docs))
        ]

        if self.active_vector_store == "faiss":
            if self.store is None or not hasattr(self.store, 'index') or self.store.index.ntotal == 0:
                # FIX: Initialize FAISS store from documents if empty
                self.store = FAISS.from_documents(documents, self.embedding_model)
            else:
                self.store.add_documents(documents)
        elif self.active_vector_store == "chroma":
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
        if self.active_vector_store == "faiss" and self.store:
            save_path = path or self.store_config.get(
                "persist_directory", "./faiss_index"
            )
            self.store.save_local(save_path)
        elif self.active_vector_store == "chroma":
            print("Chroma auto-persists. No manual save needed.")

    def load(self, path: str = None):
        """Load the vector store from disk (FAISS only)."""
        if self.active_vector_store == "faiss":
            load_path = path or self.store_config.get(
                "persist_directory", "./faiss_index"
            )
            self.store = FAISS.load_local(
                load_path, self.embedding_model, allow_dangerous_deserialization=True
            )
        else:
            print(f"Load not applicable for {self.active_vector_store} backend.")


if __name__ == "__main__":
    # FIX: Need to pass config_manager to LLM
    from manager import ConfigManager
    config_manager = ConfigManager()
    
    llm = LLM(config_manager)
    llm.switch_llm("openai")
    response = llm.process("Hello, how are you?")
    print(response)