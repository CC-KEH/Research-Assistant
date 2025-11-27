import os
import uvicorn
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from models import *
from manager import *

# Load environment variables
load_dotenv()

app = FastAPI(title="Research Assistant API", version="1.0.0")

# CORS for Tauri
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
config_manager = ConfigManager("config.json")
session_manager = SessionManager("chats.json")
llm = LLM(config_manager=config_manager)
embedding = Embedding(config_manager=config_manager)
vector_store = VectorStore(config_manager=config_manager)
assistant = Assistant(llm, embedding, vector_store, session_manager, config_manager)

# ==================== Pydantic Models ====================

class ChatRequest(BaseModel):
    message: str
    session_index: Optional[int] = None
    use_rag: bool = True
    k: int = 4

class ChatResponse(BaseModel):
    response: str
    session_index: int
    timestamp: str

class SessionCreate(BaseModel):
    name: str
    tags: Optional[List[str]] = None
    context: Optional[str] = ""

class SessionUpdate(BaseModel):
    name: Optional[str] = None
    context: Optional[str] = None
    tags: Optional[List[str]] = None

class LLMConfig(BaseModel):
    model_name: str
    api_key: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2000

class EmbeddingConfig(BaseModel):
    model_name: str
    api_key: Optional[str] = None

class VectorStoreConfig(BaseModel):
    backend: str
    api_key: Optional[str] = None
    index_name: Optional[str] = None
    dimension: Optional[int] = 1536

class DocumentAdd(BaseModel):
    documents: List[str]
    metadatas: Optional[List[dict]] = None

class SearchRequest(BaseModel):
    query: str
    k: int = 4
    filter: Optional[dict] = None

class TabProcessRequest(BaseModel):
    tab_id: str
    text: str

class BookmarkAdd(BaseModel):
    file_name: str
    file_path: str
    page_no: str

class KnowledgeStoreFile(BaseModel):
    file_name: str
    file_path: str
    feed_llm: Optional[str] = ""

# ==================== Health & Status ====================

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Server is running"}

@app.get("/status")
async def get_status():
    """Get status of all components."""
    return assistant.check()

# ==================== Configuration Endpoints ====================

@app.get("/config/llms")
async def get_llm_configs():
    """Get all available LLM configurations."""
    return config_manager.config.get("llmConfig", [])

@app.get("/config/embeddings")
async def get_embedding_configs():
    """Get all available embedding configurations."""
    return config_manager.config.get("embeddingsConfig", [])

@app.get("/config/vectorstores")
async def get_vectorstore_configs():
    """Get all available vector store configurations."""
    return config_manager.config.get("vectorStoreConfig", [])

@app.get("/config/tabs")
async def get_tabs():
    """Get all tabs (standard + custom)."""
    return config_manager.get_tabs()

@app.post("/config/tabs/custom")
async def add_custom_tab(tab_id: str, label: str, prompt: str):
    """Add a custom tab."""
    config_manager.add_custom_tab(tab_id, label, prompt)
    return {"message": "Custom tab added", "tab_id": tab_id}

@app.get("/config/bookmarks")
async def get_bookmarks():
    """Get all bookmarks."""
    return config_manager.get_bookmarks()

@app.post("/config/bookmarks")
async def add_bookmark(bookmark: BookmarkAdd):
    """Add a bookmark."""
    config_manager.add_bookmark(bookmark.file_name, bookmark.file_path, bookmark.page_no)
    return {"message": "Bookmark added"}

@app.get("/config/knowledge-store")
async def get_knowledge_store_files():
    """Get knowledge store files."""
    return config_manager.get_knowledge_store_files()

@app.post("/config/knowledge-store")
async def add_knowledge_store_file(file: KnowledgeStoreFile):
    """Add file to knowledge store."""
    config_manager.add_knowledge_store_file(file.file_name, file.file_path, file.feed_llm)
    return {"message": "File added to knowledge store"}

# ==================== LLM Endpoints ====================

@app.post("/llm/initialize")
async def initialize_llm(config: LLMConfig):
    """Initialize LLM with specified configuration."""
    try:
        llm.update_config({
            "model_name": config.model_name,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens
        })
        llm.switch_llm(config.model_name, config.api_key)
        return {"message": f"LLM initialized: {config.model_name}", "status": llm.check()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/llm/status")
async def get_llm_status():
    """Get current LLM status."""
    return llm.check()

# ==================== Embedding Endpoints ====================

@app.post("/embedding/initialize")
async def initialize_embedding(config: EmbeddingConfig):
    """Initialize embedding model."""
    try:
        embedding.switch_embedding(config.model_name, config.api_key)
        return {"message": f"Embedding initialized: {config.model_name}", "status": embedding.check()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/embedding/status")
async def get_embedding_status():
    """Get current embedding status."""
    return embedding.check()

# ==================== Vector Store Endpoints ====================

@app.post("/vectorstore/initialize")
async def initialize_vectorstore(config: VectorStoreConfig):
    """Initialize vector store."""
    try:
        if not embedding.model:
            raise HTTPException(status_code=400, detail="Embedding model not initialized")
        
        vector_store.update_config({
            "backend": config.backend,
            "index_name": config.index_name,
            "dimension": config.dimension
        })
        vector_store.initialize(embedding.model, config.api_key)
        return {"message": f"Vector store initialized: {config.backend}", "status": vector_store.check()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorstore/add")
async def add_documents(doc_request: DocumentAdd):
    """Add documents to vector store."""
    try:
        vector_store.add_documents(doc_request.documents, doc_request.metadatas)
        return {"message": f"Added {len(doc_request.documents)} documents"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorstore/search")
async def search_documents(search_request: SearchRequest):
    """Search vector store."""
    try:
        results = vector_store.retrieve(
            search_request.query, 
            k=search_request.k, 
            filter=search_request.filter
        )
        return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorstore/search-with-scores")
async def search_with_scores(search_request: SearchRequest):
    """Search vector store with similarity scores."""
    try:
        results = vector_store.retrieve_with_scores(search_request.query, k=search_request.k)
        return {
            "results": [{"content": doc, "score": score} for doc, score in results],
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorstore/save")
async def save_vectorstore(path: Optional[str] = None):
    """Save vector store (FAISS only)."""
    try:
        vector_store.save(path)
        return {"message": "Vector store saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorstore/load")
async def load_vectorstore(path: Optional[str] = None):
    """Load vector store (FAISS only)."""
    try:
        vector_store.load(path)
        return {"message": "Vector store loaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vectorstore/status")
async def get_vectorstore_status():
    """Get current vector store status."""
    return vector_store.check()

# ==================== Session Endpoints ====================

@app.post("/sessions/create")
async def create_session(session: SessionCreate):
    """Create a new chat session."""
    try:
        session_idx = session_manager.create_session(
            name=session.name,
            tags=session.tags or [],
            context=session.context or ""
        )
        return {
            "message": "Session created",
            "session_index": session_idx,
            "session": session_manager.get_session_by_index(session_idx)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
async def get_all_sessions():
    """Get all sessions."""
    return {"sessions": session_manager.get_sessions()}

@app.get("/sessions/{session_index}")
async def get_session(session_index: int):
    """Get specific session."""
    session = session_manager.get_session_by_index(session_index)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.get("/sessions/{session_index}/history")
async def get_session_history(session_index: int):
    """Get formatted history for a session."""
    session_manager.switch_session(session_index)
    return {"history": session_manager.get_formatted_history()}

@app.get("/sessions/{session_index}/stats")
async def get_session_stats(session_index: int):
    """Get session statistics."""
    stats = session_manager.get_session_stats(session_index)
    if not stats:
        raise HTTPException(status_code=404, detail="Session not found")
    return stats

@app.put("/sessions/{session_index}")
async def update_session(session_index: int, update: SessionUpdate):
    """Update session details."""
    try:
        if update.name:
            session_manager.rename_session(session_index, update.name)
        if update.context:
            session_manager.update_session_context(session_index, update.context)
        if update.tags:
            session_manager.add_session_tags(session_index, update.tags)
        return {"message": "Session updated", "session": session_manager.get_session_by_index(session_index)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sessions/{session_index}")
async def delete_session(session_index: int):
    """Delete a session."""
    try:
        session_manager.delete_session(session_index)
        return {"message": "Session deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions/{session_index}/reset")
async def reset_session(session_index: int):
    """Clear history for a session."""
    try:
        session_manager.reset_session(session_index)
        return {"message": "Session history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions/{session_index}/switch")
async def switch_session(session_index: int):
    """Switch to a different session."""
    try:
        session_manager.switch_session(session_index)
        return {"message": "Session switched", "active_session": session_index}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/search/tag/{tag}")
async def search_sessions_by_tag(tag: str):
    """Search sessions by tag."""
    indices = session_manager.search_sessions_by_tag(tag)
    sessions = [session_manager.get_session_by_index(i) for i in indices]
    return {"tag": tag, "sessions": sessions, "count": len(sessions)}

# ==================== Chat Endpoints ====================

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with the assistant (with or without RAG)."""
    try:
        # Ensure LLM is initialized
        if not llm.model:
            raise HTTPException(status_code=400, detail="LLM not initialized")
        
        # Create or switch session
        if request.session_index is not None:
            session_manager.switch_session(request.session_index)
        else:
            # Create default session if none exists
            if session_manager.active_session_index is None:
                session_manager.create_session("Default Chat")
        
        # Process request
        if request.use_rag:
            if not vector_store.store:
                raise HTTPException(status_code=400, detail="Vector store not initialized")
            response = assistant.rag(request.message, k=request.k)
        else:
            response = assistant.chat(request.message)
        
        return ChatResponse(
            response=response,
            session_index=session_manager.active_session_index,
            timestamp=datetime.datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Processing Endpoints ====================

@app.post("/process/tab")
async def process_with_tab(request: TabProcessRequest):
    """
    Process text using any tab's prompt (standard or custom).
    
    Supported tab_ids:
    - summary: Summarize the text
    - contributions: Extract main contributions
    - critical-analysis: Provide critical analysis
    - dictionary: Define terms/concepts
    - future-work: Suggest future research directions
    - Any custom tab IDs defined in config.json
    
    """
    try:
        if not llm.model:
            raise HTTPException(status_code=400, detail="LLM not initialized")
        
        result = assistant.process_tab(request.tab_id, request.text)
        return {
            "result": result, 
            "tab_id": request.tab_id,
            "tab_label": config_manager.get_tab_by_id(request.tab_id).get("label", "")
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Startup & Shutdown ====================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    print("🚀 Research Assistant API starting...")
    print(f"📋 Config loaded from: {config_manager.config_path}")
    print(f"💬 Chats loaded from: {session_manager.chats_file}")
    print("✅ Server ready!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("👋 Shutting down gracefully...")
    session_manager.save_chats()
    config_manager.save_config()

# ==================== Main ====================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🌐 Starting server on http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, reload=True)