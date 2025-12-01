import os
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from models import *
from manager import *
from api_models import *

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Research Assistant API starting...")
    print(f"📋 Config loaded from: {config_manager.config_path}")
    print(f"💬 Chats loaded from: {session_manager.chats_file}")
    print("✅ Server ready!")
    yield
    print("👋 Shutting down gracefully...")
    session_manager.save_chats()
    config_manager.save_config()

app = FastAPI(title="Research Assistant API", version="1.0.0", lifespan=lifespan)

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

# ==================== Health & Status ====================

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Server is running"}

@app.get("/status")
async def get_status():
    """Get status of all components."""
    return assistant.check()

# ==================== LLM Endpoints ====================

@app.post("/llm/initialize")
async def initialize_llm(config: LLMConfig):
    """Initialize LLM with specified configuration."""
    try:
        llm.switch_llm(config.model_name, config.api_key)
        return {"message": f"LLM initialized: {config.model_name}", "status": llm.check()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Embedding Endpoints ====================

@app.post("/embedding/initialize")
async def initialize_embedding(config: EmbeddingConfig):
    """Initialize embedding model."""
    try:
        embedding.switch_embedding(config.model_name, config.api_key)
        return {"message": f"Embedding initialized: {config.model_name}", "status": embedding.check()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Vector Store Endpoints ====================

@app.post("/vectorstore/initialize")
async def initialize_vectorstore(config: VectorStoreConfig):
    """Initialize vector store."""
    try:
        if not embedding.model:
            raise HTTPException(status_code=400, detail="Embedding model not initialized")
        
        vector_store.update_config({
            "backend": config.backend,
        })
        vector_store.switch_store(embedding.model)
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

# ==================== Main ====================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🌐 Starting server on http://127.0.0.1:{port}")
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
    
    # uvicorn main:app --host 127.0.0.1 --port 8000 --reload