import os
import uvicorn
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from manager import *
from assistant import *
from api_models import *

config_manager = None
session_manager = None
assistant = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Research Assistant API starting...")
    print("✅ Server ready! Waiting for initialize call from frontend...")
    
    yield
    
    print("👋 Shutting down gracefully...")
    
    # Save if initialized
    if assistant and hasattr(assistant, 'store') and assistant.store.store:
        try:
            assistant.save_vectorstore()
            print(f"✅ Vector store saved")
        except Exception as e:
            print(f"⚠️  Could not save vector store: {e}")
    
    if session_manager:
        try:
            session_manager.save_chats()
            print(f"✅ Chats saved to: {session_manager.chats_file}")
        except Exception as e:
            print(f"⚠️  Could not save chats: {e}")
    
    if config_manager:
        try:
            config_manager.save_config()
            print(f"✅ Config saved to: {config_manager.config_path}")
        except Exception as e:
            print(f"⚠️  Could not save config: {e}")
    
    print("✅ Shutdown complete")

app = FastAPI(title="Research Assistant API", version="1.0.0", lifespan=lifespan)

# CORS for Tauri
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Initialization Endpoint ====================

@app.post("/initialize")
async def initialize_backend(request: dict):
    """
    Initialize the backend with paths from frontend.
    This must be called before any other endpoints.
    
    Request body:
    {
        "config_path": "path/to/config.json",
        "chats_path": "path/to/chats.json",
    }
    """
    global config_manager, session_manager, assistant
    
    try:
        config_path = request.get("config_path", "config.json")
        chats_path = request.get("chats_path", "chats.json")
        
        print(f"📋 Initializing with config: {config_path}")
        print(f"💬 Initializing with chats: {chats_path}")
        
        # Initialize managers
        config_manager = ConfigManager(config_path)
        session_manager = SessionManager(chats_path)
        assistant = Assistant(config_manager, session_manager)
        
        # Try to load existing vector store
        vector_store_loaded = False
        try:
            assistant.load_vectorstore()
            print("✅ Loaded existing knowledge base")
            vector_store_loaded = True
        except Exception as e:
            print(f"⚠️  No existing vector store found")
            print("💡 You can add documents using /vectorstore/setup or /vectorstore/add")
        
        print("✅ Backend initialization complete!")
        
        return {
            "status": "initialized",
            "config_path": config_path,
            "chats_path": chats_path,
            "vector_store_loaded": vector_store_loaded,
            "components": assistant.check()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")

# ==================== Health & Status ====================

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Server is running"}

@app.get("/status")
async def get_status():
    """Get status of all components."""
    if not assistant:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    return assistant.check()

# ==================== LLM Endpoints ====================

@app.post("/llm/switch")
async def switch_llm(request: dict):
    """Switch LLM provider."""
    if not assistant:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
    try:
        model_name = request.get("model_name")
        if not model_name:
            raise HTTPException(status_code=400, detail="model_name is required")
        
        assistant.llm.switch_llm(model_name)
        return {"message": f"Switched to LLM: {model_name}", "status": assistant.llm.check()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/llm/status")
async def get_llm_status():
    """Get LLM status."""
    return assistant.llm.check()

# ==================== Embedding Endpoints ====================

@app.post("/embedding/switch")
async def switch_embedding(request: dict):
    """Switch embedding model."""
    try:
        model_name = request.get("model_name")
        if not model_name:
            raise HTTPException(status_code=400, detail="model_name is required")
        
        assistant.embedding.switch_embedding(model_name)
        
        # IMPORTANT: After switching embeddings, need to reinitialize vector store
        # because dimensions may have changed
        print("⚠️  Warning: Embedding model changed. Vector store needs reinitialization.")
        print("💡 You may need to re-add documents using /vectorstore/setup")
        
        return {
            "message": f"Switched to embedding: {model_name}",
            "status": assistant.embedding.check(),
            "warning": "Vector store may need reinitialization with new embedding dimensions"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/embedding/status")
async def get_embedding_status():
    """Get embedding status."""
    return assistant.embedding.check()

# ==================== Vector Store Endpoints ====================

@app.post("/vectorstore/switch")
async def switch_vectorstore(request: dict):
    """Switch vector store backend (FAISS/Chroma)."""
    try:
        model_name = request.get("model_name")
        if not model_name:
            raise HTTPException(status_code=400, detail="model_name is required")
        
        assistant.store.switch_store(model_name=model_name)
        return {
            "message": f"Switched to vector store: {model_name}",
            "status": assistant.store.check()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vectorstore/status")
async def get_vectorstore_status():
    """Get vector store status."""
    return assistant.store.check()

@app.post("/vectorstore/setup")
async def setup_vectorstore(doc_request: DocumentAdd):
    """
    Initialize RAG system with documents (FIRST TIME SETUP).
    Use this when starting fresh or after switching embedding models.
    """
    try:
        if not doc_request.documents:
            raise HTTPException(status_code=400, detail="No documents provided")
        
        assistant.setup_rag(doc_request.documents, doc_request.metadatas)
        
        # Auto-save after setup
        assistant.save_vectorstore("./shared_vector_db")
        
        return {
            "message": f"RAG initialized with {len(doc_request.documents)} documents",
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorstore/add")
async def add_documents(doc_request: DocumentAdd):
    """
    Add more documents to existing vector store.
    Use this to expand your knowledge base.
    """
    try:
        if not doc_request.documents:
            raise HTTPException(status_code=400, detail="No documents provided")
        
        assistant.add_documents(doc_request.documents, doc_request.metadatas)
        
        # Auto-save after adding documents
        assistant.save_vectorstore("./shared_vector_db")
        
        return {
            "message": f"Added {len(doc_request.documents)} documents",
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorstore/save")
async def save_vectorstore(request: dict = None):
    """Manually save vector store to disk."""
    try:
        path = request.get("path") if request else None
        assistant.save_vectorstore(path or "./shared_vector_db")
        return {"message": "Vector store saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorstore/load")
async def load_vectorstore(request: dict = None):
    """Manually load vector store from disk."""
    try:
        path = request.get("path") if request else None
        assistant.load_vectorstore(path or "./shared_vector_db")
        return {"message": "Vector store loaded successfully"}
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

@app.get("/sessions/active")
async def get_active_session():
    """Get currently active session."""
    if session_manager.active_session_index is None:
        raise HTTPException(status_code=404, detail="No active session")
    
    session = session_manager.get_session_by_index(session_manager.active_session_index)
    return {
        "session": session,
        "session_index": session_manager.active_session_index
    }

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
    session = session_manager.get_session_by_index(session_index)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Temporarily switch to get history
    old_session = session_manager.active_session_index
    session_manager.switch_session(session_index)
    history = session_manager.get_formatted_history()
    
    # Restore old session if needed
    if old_session is not None:
        session_manager.active_session_index = old_session
    
    return {"history": history}

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
        return {
            "message": "Session switched",
            "active_session": session_index,
            "session": session_manager.get_session_by_index(session_index)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Chat Endpoints ====================

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with the assistant (with or without RAG)."""
    try:
        # Ensure LLM is initialized
        if not assistant.llm.model:
            raise HTTPException(status_code=400, detail="LLM not initialized. Use /llm/switch first.")
        
        # Create or switch session
        if request.session_index is not None:
            session_manager.switch_session(request.session_index)
        else:
            # Create default session if none exists
            if session_manager.active_session_index is None:
                session_manager.create_session("Default Chat")
        
        # Process request
        if request.use_rag:
            if not assistant.store.store:
                raise HTTPException(
                    status_code=400,
                    detail="Vector store not initialized. Use /vectorstore/setup first."
                )
            response = assistant.query_rag(request.message, k=request.k)
        else:
            response = assistant.query(request.message)
        
        return ChatResponse(
            response=response,
            session_index=session_manager.active_session_index,
            timestamp=datetime.datetime.now().isoformat()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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
    - future-work: Suggest future research directions
    - arxiv: Extract Arxiv metadata
    - Any custom tab IDs defined in config.json
    
    """
    try:
        if not assistant.llm.model:
            raise HTTPException(status_code=400, detail="LLM not initialized. Use /llm/switch first.")
        
        result = assistant.process_tab(request.tab_id, request.text)
        tab = config_manager.get_tab_by_id(request.tab_id)
        
        return {
            "result": result,
            "tab_id": request.tab_id,
            "tab_label": tab.get("label", "") if tab else ""
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Main ====================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🌐 Starting server on http://127.0.0.1:{port}")
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=True)