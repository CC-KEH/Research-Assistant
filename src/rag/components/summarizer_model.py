import os
from dotenv import load_dotenv
import google.generativeai as genai

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate

# For Stuff Documents Chain
from langchain.docstore.document import Document
from langchain.chains.summarize import load_summarize_chain

from src.rag.components.process_files import VectorStorePipeline
from src.rag.components.prompts import chunks_template, final_combine_template


load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


class Summarizer_Model:
    def __init__(self) -> None:
        self.llm = ChatGoogleGenerativeAI(model='gemini-pro',temperature=0.3)
        self.vs = VectorStorePipeline()
        
    def summarize_chain(self,chain_type='stuff'):
        pdfs = self.vs.get_pdfs('pdfs/')
        content = self.vs.get_pdf_text(pdfs)
        self.prompt = PromptTemplate(template=final_combine_template,input_variables=['text'])
        
        if chain_type == 'stuff':
            docs = [Document(page_content=content)]
            self.chain = load_summarize_chain(self.llm,
                                              self.prompt,
                                              chain_type=chain_type,
                                              verbose=False)
        
        
        elif chain_type == 'map_reduce':
            self.chunk_prompt = PromptTemplate(template=chunks_template,input_variables=['text'])
            docs = self.vs.get_text_chunks(content,chunk_size=10000, chunk_overlap=20,for_summarization=True)
            self.chain = load_summarize_chain(self.llm,
                                              chain_type=chain_type,
                                              map_prompt=self.chunk_prompt,
                                              combine_prompt=self.prompt,
                                              verbose=False)
        
        
        elif chain_type == 'refine':
            self.chain = load_summarize_chain(self.llm,
                                              chain_type=chain_type,
                                              verbose=False)
            
        
        else:
            raise ValueError('Invalid Chain Type')
        
        output_summary = self.chain.run(docs)
        return output_summary            

        
if __name__ == '__main__':
    types = ['stuff','map_reduce','refine']
    s_model = Summarizer_Model()
    s_model.summarize_chain(chain_type=types[0])