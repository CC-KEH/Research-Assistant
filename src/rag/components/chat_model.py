import os
import json
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import google.generativeai as genai
from langchain.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains.question_answering import load_qa_chain
from langchain.prompts import PromptTemplate

# OpenAI
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings

from dotenv import load_dotenv

# Chat history
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import HumanMessage

from src.rag.components.process_files import VectorStorePipeline
from src.rag.components.prompts import chat_template
from src.utils import logger

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

class ChatModel:
    def __init__(self, model='gemini-pro', temperature=0.3, session_id='all', api_key="") -> None:
        self.llm= self.get_llm(model,temperature)
        self.embeddings = self.get_embeddings(model)
        self.store = self.load_store()
        self.session_id = session_id
        self.config = {"configurable": {"session_id": self.session_id}}
    
    def get_llm(self, model, temperature):
        if model == 'gemini-pro':
            llm = ChatGoogleGenerativeAI(model='gemini-pro',temperature=temperature)
        elif model == 'openai':
            llm = ChatOpenAI(model="gpt-4o",temperature=temperature)
        else:
            raise ValueError('Model not supported')
        return llm
    
    def get_embeddings(self,model):
        if model == 'gemini-pro':
            embeddings = GoogleGenerativeAIEmbeddings(model='models/embedding-001')
        elif model == 'openai':
            embeddings = OpenAIEmbeddings(model='text-embedding-3-large')
        else:
            raise ValueError('Model not supported')
        return embeddings
    
    def load_store(self):
        try:
            logger.info('Loading chat history')
            with open('store.json','r') as f:
                return json.loads(f.read())
        except FileNotFoundError:
            return {}
    
    def save_store(self):
        logger.info('Saving chat history')
        with open('store.json','w') as f:
            f.write(json.dumps(self.store))
    
    def get_session_history(self, session_id) -> BaseChatMessageHistory:
        if self.session_id not in self.store:
            self.store[self.session_id] = InMemoryChatMessageHistory()
        return self.store[self.session_id]
    
    def test_chat(self, question):
        model_with_memory = RunnableWithMessageHistory(self.llm, self.get_session_history)
        answer = model_with_memory.invoke([HumanMessage(content=question)],config=self.config).content
        return answer
    
    def get_conversational_chain(self):
        self.prompt = PromptTemplate(template=chat_template,input_variables=['context','question'])
        self.chain = load_qa_chain(self.llm,chain_type='stuff',prompt=self.prompt)
        return self.chain
        
    def process_user_input(self, question):
        new_db = FAISS.load_local('faiss_index',self.embeddings,allow_dangerous_deserialization=True)
        docs = new_db.similarity_search(question)
        chain = self.get_conversational_chain()
        response = chain({"input_documents": docs,"question": question}, return_only_outputs=True)
        return response['output_text']
    
    def chat(self, question=None):
        if question is None:
            question = input("Ask a question: ")
            
        if question == 'exit':
            return

        response = self.process_user_input(question)
        print(response)
    
if __name__ == '__main__':
    brain = ChatModel()
    vs = VectorStorePipeline()
    pdfs = vs.get_pdfs(pdfs_path)
    text = vs.get_pdf_text(pdfs)
    chunks = vs.get_text_chunks(text)
    vs.get_vector_store(chunks)
    
    print(brain.process_user_input("What is Advanced RAG?"))