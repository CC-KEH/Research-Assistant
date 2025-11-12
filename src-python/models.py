import datetime
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_anthropic import ChatAnthropic
from langchain_community.vectorstores import FAISS, Chroma
from langchain.schema import Document
from typing import List, Optional

from prompts import *

class LLM:
    def __init__(self, config: dict = None):
        self.config = config or {
            "temperature": 0.7,
            "max_tokens": 2000,
        }
        self.active_model = None
        self.model = None

    def check(self) -> dict:
        return {
            "status": self.model is not None,
            "model": self.active_model
        }

    def initialize(self):
        """Initialize the selected LLM model."""
        if self.active_model == "xai":
            # XAI uses OpenAI-compatible API
            self.model = ChatOpenAI(
                model=self.config.get("model_name", "grok-3"),
                base_url="https://api.x.ai/v1",
                temperature=self.config.get("temperature", 0.7),
                max_tokens=self.config.get("max_tokens", 2000)
            )
        elif self.active_model == "google":
            self.model = ChatGoogleGenerativeAI(
                model=self.config.get("model_name", "gemini-pro"),
                temperature=self.config.get("temperature", 0.7),
                max_output_tokens=self.config.get("max_tokens", 2000)
            )
        elif self.active_model == "openai":
            self.model = ChatOpenAI(
                model=self.config.get("model_name", "gpt-4"),
                temperature=self.config.get("temperature", 0.7),
                max_tokens=self.config.get("max_tokens", 2000)
            )
        elif self.active_model == "anthropic":
            self.model = ChatAnthropic(
                model=self.config.get("model_name", "claude-3-5-sonnet-20241022"),
                temperature=self.config.get("temperature", 0.7),
                max_tokens=self.config.get("max_tokens", 2000)
            )
        else:
            raise ValueError(f"Unknown model: {self.active_model}")

    def switch_llm(self, model_name: str):
        """Switch to a different LLM provider."""
        self.active_model = model_name
        self.initialize()
    
    def update_config(self, new_config: dict):
        """Update configuration parameters."""
        self.config.update(new_config)
        if self.model:
            self.initialize()  # Recreate model with new config
    
    def process(self, query: str, context: str = "") -> str:
        """Send query (and optional context) to the LLM."""
        if not self.model:
            raise ValueError("No model initialized. Call switch_llm() first.")
        
        if context:
            # Use RAG prompt template
            prompt = chat_template.invoke({
                "context": context,
                "text": query
            })
        else:
            # Direct query
            prompt = query
        
        response = self.model.invoke(prompt)
        return response.content


class Embedding:
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.active_model = None
        self.model = None
        
    def check(self) -> dict:
        return {
            "status": self.model is not None,
            "model": self.active_model
        }
    
    def initialize(self):
        """Initialize the selected embedding model."""
        if self.active_model == "openai":
            self.model = OpenAIEmbeddings(
                model=self.config.get("model_name", "text-embedding-3-small")
            )
        elif self.active_model == "google":
            self.model = GoogleGenerativeAIEmbeddings(
                model=self.config.get("model_name", "models/embedding-001")
            )
        else:
            raise ValueError(f"Unknown embedding model: {self.active_model}")
    
    def switch_embedding(self, model_name: str):
        """Switch to a different embedding provider."""
        self.active_model = model_name
        self.initialize()
    
    def update_config(self, new_config: dict):
        """Update configuration parameters."""
        self.config.update(new_config)
        if self.model:
            self.initialize()
    
    def embed(self, text: str) -> List[float]:
        """Generate embeddings for the given text."""
        if not self.model:
            raise ValueError("No embedding model initialized. Call switch_embedding() first.")
        
        return self.model.embed_query(text)
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple documents."""
        if not self.model:
            raise ValueError("No embedding model initialized. Call switch_embedding() first.")
        
        return self.model.embed_documents(texts)


class VectorStore:
    def __init__(self, config: dict = None):
        self.config = config or {"backend": "faiss"}
        self.store = None
        self.embedding_function = None
        
    def check(self) -> dict:
        return {
            "status": self.store is not None,
            "backend": self.config.get("backend")
        }
    
    def initialize(self, embedding_function):
        """Initialize vector store with embedding function."""
        self.embedding_function = embedding_function
        backend = self.config.get("backend", "faiss")
        
        if backend == "faiss":
            # FAISS will be created when documents are added
            pass
        elif backend == "chroma":
            self.store = Chroma(
                embedding_function=embedding_function,
                persist_directory=self.config.get("persist_directory", "./chroma_db")
            )
        else:
            raise ValueError(f"Unknown vector store backend: {backend}")
    
    def switch_store(self, backend: str):
        """Switch to a different vector store backend."""
        self.config["backend"] = backend
        if self.embedding_function:
            self.initialize(self.embedding_function)
    
    def update_config(self, new_config: dict):
        """Update configuration parameters."""
        self.config.update(new_config)
    
    def add_documents(self, docs: List[str], metadatas: Optional[List[dict]] = None):
        """Add documents to the vector store."""
        if not self.embedding_function:
            raise ValueError("Embedding function not set. Call initialize() first.")
        
        # Convert strings to Document objects
        documents = [Document(page_content=doc, metadata=meta or {}) 
                    for doc, meta in zip(docs, metadatas or [{}] * len(docs))]
        
        backend = self.config.get("backend", "faiss")
        
        if backend == "faiss":
            if self.store is None:
                self.store = FAISS.from_documents(documents, self.embedding_function)
            else:
                self.store.add_documents(documents)
        elif backend == "chroma":
            self.store.add_documents(documents)
        
    def retrieve(self, query: str, k: int = 4) -> List[str]:
        """Retrieve relevant documents for a query."""
        if not self.store:
            return []
        
        docs = self.store.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]
    
    def save(self, path: str = None):
        """Save the vector store to disk."""
        backend = self.config.get("backend", "faiss")
        
        if backend == "faiss" and self.store:
            save_path = path or self.config.get("persist_directory", "./faiss_index")
            self.store.save_local(save_path)
        elif backend == "chroma":
            # Chroma auto-persists if persist_directory is set
            pass
    
    def load(self, path: str = None):
        """Load the vector store from disk."""
        if not self.embedding_function:
            raise ValueError("Embedding function not set. Call initialize() first.")
        
        backend = self.config.get("backend", "faiss")
        
        if backend == "faiss":
            load_path = path or self.config.get("persist_directory", "./faiss_index")
            self.store = FAISS.load_local(
                load_path, 
                self.embedding_function,
                allow_dangerous_deserialization=True
            )


class SessionManager:
    def __init__(self, sessions: dict = None):
        self.sessions = sessions or {}
        self.active_session = None
    
    def check(self) -> Optional[dict]:
        return { 
            "status" : self.active_session is not None,
            "session" : self.sessions.get(self.active_session, None)
            }
    
    def reset(self):
        """Reset all sessions."""
        self.sessions = {}
        self.active_session = None

    def create_session(self, name: str) -> int:
        """Create a new session."""
        session_id = len(self.sessions) + 1
        self.sessions[session_id] = {
            "name": name,
            "history": [],
            "metadata": {}
        }
        self.active_session = session_id
        return session_id

    def get_sessions(self) -> dict:
        """Get all sessions."""
        return self.sessions
    
    def switch_session(self, session_id: int):
        """Switch to a different session."""
        if session_id in self.sessions:
            self.active_session = session_id
        else:
            raise ValueError(f"Session {session_id} does not exist")
    
    def delete_session(self, session_id: int):
        """Delete a session."""
        self.sessions.pop(session_id, None)
        if self.active_session == session_id:
            self.active_session = None
    
    def reset_session(self, session_id: int):
        """Clear history for a session."""
        if session_id in self.sessions:
            self.sessions[session_id]["history"] = []

    def add_to_history(self, role: str, content: str, timestamp: datetime = None):
        """Add a message to the active session's history."""
        if self.active_session:
            if timestamp is None:
                timestamp = datetime.now()
            
            self.sessions[self.active_session]["history"].append({
                "role": role,
                "content": content,
                "timestamp": timestamp
            })
    
    def format_timestamp(self, timestamp: datetime) -> str:
        """
        Format timestamp intelligently:
        - If same day: show only time (e.g., "2:30 PM")
        - If different day: show date, day, and time (e.g., "Nov 11, Monday, 2:30 PM")
        """
        now = datetime.now()
        message_date = timestamp.date()
        today = now.date()
        
        # Check if the message is from today
        if message_date == today:
            return timestamp.strftime("%I:%M %p")  # e.g., "02:30 PM"
        else:
            return timestamp.strftime("%b %d • %A • %I:%M %p")  # e.g., "Nov 11 • Monday • 02:30 PM"
    
    def get_formatted_history(self) -> list:
        """Get history with formatted timestamps."""
        if not self.active_session:
            return []
        
        history = self.sessions[self.active_session]["history"]
        formatted_history = []
        
        for message in history:
            formatted_message = {
                "role": message["role"],
                "content": message["content"],
                "timestamp": self.format_timestamp(message["timestamp"])
            }
            formatted_history.append(formatted_message)
        
        return formatted_history
    

class Assistant:
    def __init__(self, llm: LLM, embedding: Embedding, store: VectorStore, session_manager: SessionManager):
        self.llm = llm
        self.embedding = embedding
        self.store = store
        self.sessions = session_manager
    
    def check(self) -> dict:
        """Check status of all components."""
        return {
            "llm": self.llm.check(),
            "embedding": self.embedding.check(),
            "vectorstore": self.store.check(),
            "session": self.sessions.check()
        }
    
    def rag(self, query: str, k: int = 4) -> str:
        """Retrieve relevant documents and generate answer."""
        docs = self.store.retrieve(query, k=k)
        context = "\n\n".join(docs)
        
        timestamp = datetime.now()
        response = self.llm.process(query, context)
        
        # Add to session history
        self.sessions.add_to_history("user", query, timestamp)
        self.sessions.add_to_history("assistant", response, timestamp)
        
        return response
    
    def summarize(self, text: str, summary_type: str = "detailed") -> str:
        """Summarize text using appropriate template."""
        if summary_type == "detailed":
            prompt = final_combine_template.invoke({"text": text})
        else:
            prompt = chunks_template.invoke({"text": text})
        
        response = self.llm.model.invoke(prompt)
        return response.content
    
    def contributions(self, paper_text: str) -> str:
        """Extract main contributions from a paper."""
        prompt = f"What are the main contributions of this paper?\n\n{paper_text}"
        return self.llm.process(prompt)
    
    def critical_analysis(self, paper_text: str) -> str:
        """Provide critical analysis of a paper."""
        prompt = f"Provide a critical analysis of this paper:\n\n{paper_text}"
        return self.llm.process(prompt)
    
    def future_work(self, paper_text: str) -> str:
        """Suggest future work based on a paper."""
        prompt = f"What potential future work is suggested by this paper?\n\n{paper_text}"
        return self.llm.process(prompt)
    
    def chat(self, query: str) -> str:
        """Simple chat without RAG."""
        timestamp = datetime.now()
        response = self.llm.process(query)
        
        # Add to session history with timestamp
        self.sessions.add_to_history("user", query, timestamp)
        self.sessions.add_to_history("assistant", response, timestamp)
        
        return response