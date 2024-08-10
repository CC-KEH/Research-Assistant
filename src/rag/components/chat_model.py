import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import google.generativeai as genai
from langchain.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains.question_answering import load_qa_chain
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv

from src.rag.components.process_files import VectorStorePipeline
from src.rag.components.prompts import chat_template

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


class ChatModel:
    def __init__(self) -> None:
        self.llm = ChatGoogleGenerativeAI(model='gemini-pro',temperature=0.3)

    def get_conversational_chain(self):
        self.prompt = PromptTemplate(template=chat_template,input_variables=['context','question'])
        self.chain = load_qa_chain(self.llm,chain_type='stuff',prompt=self.prompt)
        return self.chain
        
    def process_user_input(self,question):
        embeddings = GoogleGenerativeAIEmbeddings(model='models/embedding-001')
        new_db = FAISS.load_local('faiss_index',embeddings,allow_dangerous_deserialization=True)
        docs = new_db.similarity_search(question)
        chain = self.get_conversational_chain()
        response = chain({"input_documents": docs,"question": question},return_only_outputs=True)
        return response['output_text']
    
if __name__ == '__main__':
    brain = ChatModel()
    vs = VectorStorePipeline()
    pdfs = vs.get_pdfs(pdfs_path)
    text = vs.get_pdf_text(pdfs)
    chunks = vs.get_text_chunks(text)
    vs.get_vector_store(chunks)
    
    print(brain.process_user_input("What is Advanced RAG?"))