import os
import uvicorn
from fastapi import FastAPI
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from models import *

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS for Tauri
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Example: Simple chat endpoint
class ChatRequest(BaseModel):
    message: str
    model: str = "gpt-4"

@app.post("/chat")
async def chat(request: ChatRequest):
    # TODO: Implement LangChain chat logic
    return {
        "response": f"Echo: {request.message}",
        "model": request.model
    }

# Example: Vector search endpoint
class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/search")
async def search(request: SearchRequest):
    # TODO: Implement Pinecone vector search
    return {
        "results": [],
        "query": request.query
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port)