from pydantic import BaseModel
from typing import Optional, List

class InitializeRequest(BaseModel):
    config_path: str
    chats_path: str

class SwitchLlmRequest(BaseModel):
    llm_provider: str

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

class DocumentAdd(BaseModel):
    documents: List[str]
    metadatas: Optional[List[dict]] = None

class FileInfo(BaseModel):
    file_name: str
    file_path: str
    file_type: str

class TabProcessRequest(BaseModel):
    tab_id: str
    file_path: str
