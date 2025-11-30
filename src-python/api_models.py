from pydantic import BaseModel
from typing import Optional, List

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

class TabProcessRequest(BaseModel):
    tab_id: str
    text: str