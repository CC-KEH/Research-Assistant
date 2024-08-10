from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.vectorstores import FAISS
import os

class VectorStorePipeline:
    
    def __init__(self):
        pass
    
    def get_pdfs(self,pdfs_path):
        pdfs = []
        for pdf in os.listdir(pdfs_path):
            pdfs.append(pdfs_path + pdf)
        return pdfs
    
    def get_pdf_text(self,pdf_docs):
        text = ""
        for pdf in pdf_docs:
            pdf_reader = PdfReader(pdf)
            for page in pdf_reader.pages:
                text += page.extract_text()
        return text


    def get_text_chunks(self,text,chunk_size=10000, chunk_overlap=1000, for_summarization=False):
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        
        if for_summarization:
            chunks = text_splitter.create_documents([text])
        
        else:
            chunks = text_splitter.split_text(text)
        
        return chunks


    def get_vector_store(self,text_chunks):
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        vector_store = FAISS.from_texts(text_chunks, embedding=embeddings)
        vector_store.save_local("faiss_index")
        
    def run_pipeline(self,pdfs_path):
        pdfs = self.get_pdfs(pdfs_path)
        text = self.get_pdf_text(pdfs)
        chunks = self.get_text_chunks(text)
        self.get_vector_store(chunks)
        return pdfs