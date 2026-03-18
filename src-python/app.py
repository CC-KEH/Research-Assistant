import os
import datetime
import uvicorn
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from manager import ConfigManager, SessionManager
from assistant import Assistant
from api_models import SessionCreate, SessionUpdate, ChatRequest, ChatResponse, TabProcessRequest

config_manager = None
session_manager = None
assistant = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - keep it simple to avoid blocking
    print("Research Assistant API starting...")
    print("Server ready! Waiting for initialize call from frontend...")
    print("Available endpoints: /health, /initialize, /status")
    
    yield
    
    print("\n Shutting down gracefully...")
    
    # Shutdown - save state if initialized
    try:
        if assistant and hasattr(assistant, 'llm') and assistant.model.store:
            try:
                assistant.model.save()
                print("Vector store saved")
            except Exception as e:
                print(f"Could not save vector store: {e}")
    except Exception:
        pass
    
    try:
        if session_manager:
            session_manager.save_chats()
            print(f"Chats saved")
    except Exception as e:
        print(f"Could not save chats: {e}")
    
    try:
        if config_manager:
            config_manager.save()
            print(f"Config saved")
    except Exception as e:
        print(f"Could not save config: {e}")
    
    print("Shutdown complete")

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
        "config_path": "path/to/config.json",  # Required: path to config.json
        "chats_path": "path/to/chats.json",    # Required: path to chats.json
    }
    
    Example:
    {
        "config_path": "C:/Users/user/Documents/config.json",
        "chats_path": "C:/Users/user/Documents/chats.json"
    }
    """
    global config_manager, session_manager, assistant
    
    try:
        # Extract paths from request
        config_path = request.get("config_path")
        chats_path = request.get("chats_path")
        
        # Validate that paths were provided
        if not config_path:
            raise ValueError("config_path is required")
        if not chats_path:
            raise ValueError("chats_path is required")
        
        print(f"\nInitializing backend...")
        print(f"Config path: {config_path}")
        print(f"Chats path:  {chats_path}")
        
        # Check if config file exists
        import os
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found at: {config_path}")
        
        print("Config file found")
        
        # Initialize managers with provided paths
        config_manager = ConfigManager(config_path)
        session_manager = SessionManager(chats_path)
        assistant = Assistant(config_manager, session_manager)
        print("Managers initialized")
        
        # Try to load existing vector store
        vector_store_loaded = False
        try:
            assistant.model.load()
            print("Loaded existing knowledge base")
            vector_store_loaded = True
        except Exception as e:
            print(f"No existing vector store found")
            print("You can add documents using /vectorstore/setup or /vectorstore/add")
        
        print("Backend initialization complete!\n")
        
        return {
            "status": "initialized",
            "config_path": config_path,
            "chats_path": chats_path,
            "vector_store_loaded": vector_store_loaded,
            "components": assistant.model.check()
        }
        
    except FileNotFoundError as e:
        error_msg = f"File not found: {str(e)}"
        print(f"{error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    except ValueError as e:
        error_msg = f"Invalid request: {str(e)}"
        print(f"{error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    except Exception as e:
        error_msg = f"Initialization failed: {str(e)}"
        print(f"{error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

# ==================== Health & Status ====================

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Server is running"}

@app.get("/status")
async def get_status():
    """Get status of all components."""
    if not assistant:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    return assistant.model.check()

# ==================== LLM Endpoints ====================

@app.post("/llm/switch")
async def switch_llm(request: dict):
    """Switch LLM provider."""
    if not assistant:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
    try:
        llm_provider = request.get("llm_provider")
        if not llm_provider:
            raise HTTPException(status_code=400, detail="llm_provider is required")
        
        assistant.model.switch_llm(llm_provider)
        return {"message": f"Switched to LLM: {llm_provider}", "status": assistant.model.check()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/llm/status")
async def get_llm_status():
    """Get LLM status."""
    if not assistant:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    return assistant.model.check()

# ==================== Session Endpoints ====================

@app.post("/sessions/create")
async def create_session(session: SessionCreate):
    """Create a new chat session."""
    if not session_manager:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
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
    if not session_manager:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    return {"sessions": session_manager.get_sessions()}

@app.get("/sessions/active")
async def get_active_session():
    """Get currently active session."""
    if not session_manager:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
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
    if not session_manager:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
    session = session_manager.get_session_by_index(session_index)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.get("/sessions/{session_index}/history")
async def get_session_history(session_index: int):
    """Get formatted history for a session."""
    if not session_manager:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
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
    if not session_manager:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
    stats = session_manager.get_session_stats(session_index)
    if not stats:
        raise HTTPException(status_code=404, detail="Session not found")
    return stats

@app.put("/sessions/{session_index}")
async def update_session(session_index: int, update: SessionUpdate):
    """Update session details."""
    if not session_manager:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
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
    if not session_manager:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
    try:
        session_manager.delete_session(session_index)
        return {"message": "Session deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions/{session_index}/reset")
async def reset_session(session_index: int):
    """Clear history for a session."""
    if not session_manager:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
    try:
        session_manager.reset_session(session_index)
        return {"message": "Session history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions/{session_index}/switch")
async def switch_session(session_index: int):
    """Switch to a different session."""
    if not session_manager:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
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
    """
    Chat with the assistant (with or without RAG).
    
    Parameters:
    - message: The user's message
    - use_rag: Whether to use RAG (Retrieval-Augmented Generation)
    - session_index: (Optional) Session to use. Creates default if not provided
    - k: Number of documents to retrieve (for RAG)
    """
    if not assistant:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
    try:
        # Ensure LLM is initialized
        if not assistant.model._llm:
            raise HTTPException(status_code=400, detail="LLM not initialized. Use /llm/switch first.")
        
        # Create or switch session
        if request.session_index is not None:
            session_manager.switch_session(request.session_index)
        else:
            # Create default session if none exists
            if session_manager.active_session_index is None:
                session_manager.create_session("Default Chat")
        
        # Save user message to history
        session_manager.add_to_history(request.message, is_ai=False)
        
        # Process request (handles context retrieval internally)
        if request.use_rag:
            if not assistant.model.store:
                raise HTTPException(
                    status_code=400,
                    detail="Vector store not initialized. Use /vectorstore/setup first."
                )
            response = assistant.query_rag(request.message, k=request.k or 4)
        else:
            response = assistant.query(request.message)
        
        # Save assistant response to history
        session_manager.add_to_history(response, is_ai=True)
        
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
    if not assistant:
        raise HTTPException(status_code=400, detail="Backend not initialized. Call /initialize first.")
    
    try:
        if not assistant.model._llm:
            raise HTTPException(status_code=400, detail="LLM not initialized. Use /llm/switch first.")
        
        result = assistant.process_tab(request.tab_id)
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
    print(f"Starting server on http://127.0.0.1:{port}")
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=True)