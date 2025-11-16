from prompts import *
from models import *

class Assistant:
    def __init__(self, llm: LLM, embedding: Embedding, store: VectorStore, 
                 session_manager: SessionManager, config_manager: ConfigManager = None):
        self.llm = llm
        self.embedding = embedding
        self.store = store
        self.sessions = session_manager
        self.config_manager = config_manager
    
    def check(self) -> dict:
        """Check status of all components."""
        return {
            "llm": self.llm.check(),
            "embedding": self.embedding.check(),
            "vectorstore": self.store.check(),
            "session": self.sessions.check()
        }
    
    def rag(self, query: str, k: int = 4, filter: dict = None) -> str:
        """Retrieve relevant documents and generate answer."""
        docs = self.store.retrieve(query, k=k, filter=filter)
        context = "\n\n".join(docs)
        
        timestamp = datetime.datetime.now()
        response = self.llm.process(query, context)
        
        # Add to session history (is_ai=False for user, is_ai=True for assistant)
        self.sessions.add_to_history(query, is_ai=False, timestamp=timestamp)
        self.sessions.add_to_history(response, is_ai=True, timestamp=timestamp)
        
        return response
    
    def process_tab(self, tab_id: str, text: str) -> str:
        """Process text using a tab's custom prompt."""
        if not self.config_manager:
            raise ValueError("ConfigManager not provided")
        
        tab = self.config_manager.get_tab_by_id(tab_id)
        if not tab:
            raise ValueError(f"Tab {tab_id} not found")
        
        prompt = tab["prompt"].replace("{text}", text)
        response = self.llm.model.invoke(prompt)
        return response.content
    
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
        prompt = contributions_prompt_template.invoke({"text": paper_text})
        response = self.llm.model.invoke(prompt)
        return response.content
    
    def critical_analysis(self, paper_text: str) -> str:
        """Provide critical analysis of a paper."""
        prompt = critical_analysis_prompt_template.invoke({"text": paper_text})
        response = self.llm.model.invoke(prompt)
        return response.content
    
    def future_work(self, paper_text: str) -> str:
        """Suggest future work based on a paper."""
        prompt = future_work_prompt_template.invoke({"text": paper_text})
        response = self.llm.model.invoke(prompt)
        return response.content
    
    def chat(self, query: str) -> str:
        """Simple chat without RAG."""
        timestamp = datetime.datetime.now()
        response = self.llm.process(query)
        
        # Add to session history
        self.sessions.add_to_history(query, is_ai=False, timestamp=timestamp)
        self.sessions.add_to_history(response, is_ai=True, timestamp=timestamp)
        
        return response