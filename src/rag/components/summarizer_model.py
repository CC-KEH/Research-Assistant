import os
from dotenv import load_dotenv
import google.generativeai as genai

from langchain.chains.combine_documents.base import BaseCombineDocumentsChain
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate


# OpenAI
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings

# For Stuff Documents Chain
from langchain.docstore.document import Document
from langchain.chains.summarize import load_summarize_chain

from src.rag.components.process_files import VectorStorePipeline
from src.rag.components.prompts import chunks_template, final_combine_template


load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


class Summarizer_Model:
    def __init__(self, model='gemini-1.5-pro-latest', api_key="", temperature=0.3, template=final_combine_template, chain_type='stuff') -> None:
        self.llm = self.get_llm(model,api_key,temperature)
        self.vs = VectorStorePipeline(model=model, api_key=api_key)
        self.chain_type = chain_type
        self.template = template
            
    def get_llm(self, model, api_key, temperature):
        if model == 'gemini-1.5-pro-latest':
            llm = ChatGoogleGenerativeAI(model='gemini-1.5-pro-latest', temperature=temperature, google_api_key=api_key)
        
        elif model == 'openai':
            llm = ChatOpenAI(model="gpt-4o", temperature=temperature, openai_api_key=api_key)
        
        else:
            raise ValueError('Model not supported')
        
        return llm
    
    def summarize_single_chain(self,file_path,content=None):
        if content is None:
            content = self.vs.get_pdf_text(file_path,single=True)
            
        self.prompt = PromptTemplate(template=final_combine_template,input_variables=['text'])
        docs = [Document(page_content=content)]
        self.chain: BaseCombineDocumentsChain = load_summarize_chain(llm=self.llm,
                                              prompt=self.prompt,
                                          chain_type=self.chain_type,
                                          verbose=False)
        output_summary = self.chain.invoke(docs)
        return output_summary
    
    
    def summarize_all_chain(self, pdfs=None, content=None):
        if pdfs is None:
            pdfs = self.vs.get_pdfs('library/')
        content = self.vs.get_pdf_text(pdfs)
        self.prompt = PromptTemplate(template=self.template,input_variables=['text'])
        
        if self.chain_type == 'stuff':
            docs = [Document(page_content=content)]
            self.chain = load_summarize_chain(llm=self.llm,
                                              prompt=self.prompt,
                                              chain_type=self.chain_type,
                                              verbose=False)
        
        
        elif self.chain_type == 'map_reduce':
            self.chunk_prompt = PromptTemplate(template=chunks_template,input_variables=['text'])
            docs = self.vs.get_text_chunks(content,chunk_size=10000, chunk_overlap=20,for_summarization=True)
            self.chain = load_summarize_chain(self.llm,
                                              chain_type=self.chain_type,
                                              map_prompt=self.chunk_prompt,
                                              combine_prompt=self.prompt,
                                              verbose=False)
        
        
        elif self.chain_type == 'refine':
            self.chain = load_summarize_chain(self.llm,
                                              chain_type=self.chain_type,
                                              verbose=False)
            
        
        else:
            raise ValueError('Invalid Chain Type')
        
        output_summary = self.chain.invoke(docs)
        return output_summary            
    
if __name__ == '__main__':
    types = ['stuff','map_reduce','refine']
    s_model = Summarizer_Model()
    