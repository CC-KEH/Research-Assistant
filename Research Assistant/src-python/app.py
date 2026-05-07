import os
import logging
import datetime
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from manager import ConfigManager, SessionManager
from assistant import Assistant
from api_models import (
    SessionCreate,
    SessionUpdate,
    ChatRequest,
    ChatResponse,
    TabProcessRequest,
    InitializeRequest,
    SwitchLlmRequest,
)

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.config_manager = None
    app.state.session_manager = None
    app.state.assistant = None

    logger.info("Research Assistant API starting...")
    logger.info("Waiting for /initialize call from frontend...")

    yield

    logger.info("Shutting down gracefully...")

    try:
        assistant = app.state.assistant
        if assistant and hasattr(assistant, "model") and assistant.model.store:
            assistant.model.save()
            logger.info("Vector store saved")
    except Exception as e:
        logger.error(f"Could not save vector store: {e}")

    try:
        session_manager = app.state.session_manager
        if session_manager:
            session_manager.save_chats()
            logger.info("Chats saved")
    except Exception as e:
        logger.error(f"Could not save chats: {e}")

    try:
        config_manager = app.state.config_manager
        if config_manager:
            config_manager.save()
            logger.info("Config saved")
    except Exception as e:
        logger.error(f"Could not save config: {e}")

    logger.info("Shutdown complete")


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="Research Assistant API", version="1.0.0", lifespan=lifespan)

DEBUG = os.getenv("DEBUG", "false").lower() == "true"
CORS_ORIGINS = [
    "http://localhost:1420",
    "tauri://localhost",
    *(["http://localhost:3000"] if DEBUG else []),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Dependencies ──────────────────────────────────────────────────────────────

def get_assistant(request: Request) -> Assistant:
    assistant = request.app.state.assistant
    if not assistant:
        raise HTTPException(
            status_code=400,
            detail="Backend not initialized. Call /initialize first.",
        )
    return assistant

def get_session_manager(request: Request) -> SessionManager:
    session_manager = request.app.state.session_manager
    if not session_manager:
        raise HTTPException(
            status_code=400,
            detail="Backend not initialized. Call /initialize first.",
        )
    return session_manager

def get_config_manager(request: Request) -> ConfigManager:
    config_manager = request.app.state.config_manager
    if not config_manager:
        raise HTTPException(
            status_code=400,
            detail="Backend not initialized. Call /initialize first.",
        )
    return config_manager

# ─── Initialization ────────────────────────────────────────────────────────────

@app.post("/initialize")
async def initialize_backend(request: InitializeRequest):
    """
    Initialize the backend with paths from the frontend.
    Must be called before any other endpoints.
    """
    print(f"\n\n\n \t\tReceived initialization request: {request}")
    if app.state.session_manager:
        try:
            app.state.session_manager.save_chats()
            logger.info("Saved existing chats before reinitializing")
        except Exception as e:
            logger.warning(f"Could not save chats before reinitialize: {e}")

    if app.state.config_manager:
        try:
            app.state.config_manager.save()
            logger.info("Saved existing config before reinitializing")
        except Exception as e:
            logger.warning(f"Could not save config before reinitialize: {e}")

    try:
        if not os.path.exists(request.config_path):
            raise FileNotFoundError(f"Config file not found at: {request.config_path}")

        logger.info(f"Initializing backend — config: {request.config_path}, chats: {request.chats_path}")
        
        if app.state.assistant:
            app.state.assistant = None
            app.state.session_manager = None
            app.state.config_manager = None
            
        config_manager  = ConfigManager(request.config_path)
        session_manager = SessionManager(request.chats_path)
        assistant       = Assistant(config_manager, session_manager)

        app.state.config_manager  = config_manager
        app.state.session_manager = session_manager
        app.state.assistant       = assistant

        logger.info("Managers initialized")
        
        components = assistant.model.check()

        return {
            "status": "initialized",
            "config_path": request.config_path,
            "chats_path": request.chats_path,
            "vector_store_loaded": components["vector_store_ready"],  # ← read from check() instead
            "components": components,
        }

    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        logger.error(str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Initialization failed")
        raise HTTPException(status_code=500, detail=f"Initialization failed: {e}")


# ─── Health & Status ───────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Server is running"}


@app.get("/status")
async def get_status(assistant: Assistant = Depends(get_assistant)):
    return assistant.model.check()


# ─── LLM Endpoints ────────────────────────────────────────────────────────────

@app.post("/llm/switch")
async def switch_llm(
    request: SwitchLlmRequest,
    assistant: Assistant = Depends(get_assistant),
):
    try:
        assistant.model.switch_llm(request.llm_provider)
        return {
            "message": f"Switched to LLM: {request.llm_provider}",
            "status": assistant.model.check(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/llm/status")
async def get_llm_status(assistant: Assistant = Depends(get_assistant)):
    return assistant.model.check()


# ─── Session Endpoints ─────────────────────────────────────────────────────────

@app.post("/sessions/create")
async def create_session(
    session: SessionCreate,
    session_manager: SessionManager = Depends(get_session_manager),
):
    try:
        session_idx = session_manager.create_session(
            name=session.name,
            tags=session.tags or [],
            context=session.context or "",
        )
        return {
            "message": "Session created",
            "session_index": session_idx,
            "session": session_manager.get_session_by_index(session_idx),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions")
async def get_all_sessions(
    session_manager: SessionManager = Depends(get_session_manager),
):
    return {"sessions": session_manager.get_sessions()}


@app.get("/sessions/active")
async def get_active_session(
    session_manager: SessionManager = Depends(get_session_manager),
):
    if session_manager.active_session_index is None:
        raise HTTPException(status_code=404, detail="No active session")

    session = session_manager.get_session_by_index(session_manager.active_session_index)
    return {"session": session, "session_index": session_manager.active_session_index}


@app.get("/sessions/{session_index}")
async def get_session(
    session_index: int,
    session_manager: SessionManager = Depends(get_session_manager),
):
    session = session_manager.get_session_by_index(session_index)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.get("/sessions/{session_index}/history")
async def get_session_history(
    session_index: int,
    session_manager: SessionManager = Depends(get_session_manager),
):
    session = session_manager.get_session_by_index(session_index)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    history = session_manager.get_formatted_history(session_index)
    return {"history": history}


@app.get("/sessions/{session_index}/stats")
async def get_session_stats(
    session_index: int,
    session_manager: SessionManager = Depends(get_session_manager),
):
    stats = session_manager.get_session_stats(session_index)
    if not stats:
        raise HTTPException(status_code=404, detail="Session not found")
    return stats


@app.put("/sessions/{session_index}")
async def update_session(
    session_index: int,
    update: SessionUpdate,
    session_manager: SessionManager = Depends(get_session_manager),
):
    try:
        if update.name:
            session_manager.rename_session(session_index, update.name)
        if update.context:
            session_manager.update_session_context(session_index, update.context)
        if update.tags:
            session_manager.add_session_tags(session_index, update.tags)
        return {
            "message": "Session updated",
            "session": session_manager.get_session_by_index(session_index),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/sessions/{session_index}")
async def delete_session(
    session_index: int,
    session_manager: SessionManager = Depends(get_session_manager),
):
    try:
        session_manager.delete_session(session_index)
        return {"message": "Session deleted"}
    except ValueError as e:                              
        raise HTTPException(status_code=404, detail=str(e)) 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sessions/{session_index}/reset")
async def reset_session(
    session_index: int,
    session_manager: SessionManager = Depends(get_session_manager),
):
    try:
        session_manager.reset_session(session_index)
        return {"message": "Session history cleared"}
    except ValueError as e:                              
        raise HTTPException(status_code=404, detail=str(e)) 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sessions/{session_index}/switch")
async def switch_session(
    session_index: int,
    session_manager: SessionManager = Depends(get_session_manager),
):
    try:
        session_manager.switch_session(session_index)
        return {
            "message": "Session switched",
            "active_session": session_index,
            "session": session_manager.get_session_by_index(session_index),
        }
    except ValueError as e:                              
        raise HTTPException(status_code=404, detail=str(e)) 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Chat Endpoint ─────────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    assistant: Assistant = Depends(get_assistant),
    session_manager: SessionManager = Depends(get_session_manager),
):
    try:
        if not assistant.model.check()["status"]:
            raise HTTPException(status_code=400, detail="LLM not initialized...")

        if request.session_index is not None:
            session_manager.switch_session(request.session_index)
        elif session_manager.active_session_index is None:
            session_manager.create_session("Default Chat")

        session_manager.add_to_history(request.message, is_ai=False)

        if request.use_rag:
            if not assistant.model.store:
                raise HTTPException(
                    status_code=400,
                    detail="Vector store not initialized. Use /vectorstore/setup first.",
                )
            response = assistant.query_rag(request.message, k=request.k or 4)
        else:
            response = assistant.query(request.message)

        session_manager.add_to_history(response, is_ai=True)

        return ChatResponse(
            response=response,
            session_index=session_manager.active_session_index,
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Processing Endpoint ───────────────────────────────────────────────────────

@app.post("/process_tabs")
async def process_with_tab(
    request: TabProcessRequest,
    assistant: Assistant = Depends(get_assistant),
):
    try:
        if not assistant.model.check()["status"]:
            raise HTTPException(status_code=400, detail="LLM not initialized...")

        result = assistant.process_tab(request.tab_id, request.file_path)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    reload = DEBUG  # only reload in debug/dev mode
    logger.info(f"Starting server on http://127.0.0.1:{port} (reload={reload})")
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=reload)