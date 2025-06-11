import json
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import google.generativeai as genai
# from langchain.vectorstores import FAISS
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.history_aware_retriever import create_history_aware_retriever
# OpenAI
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings


# Chat history
from langchain_core.chat_history import BaseChatMessageHistory
# from langchain.memory import ChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import AIMessage
from langchain_core.prompts import MessagesPlaceholder

from src.constants import CHAT_HISTORY_DIR
from src.rag.components.process_files import VectorStorePipeline
from src.rag.components.prompts import chat_template
from src.utils import logger


class ChatModel:
    def __init__(
        self,
        model="gemini-1.5-pro-latest",
        temperature=0.3,
        session_id="",
        llm_api_key="",
        embedding_api_key="",
        vector_store_path="",
        project_path="",
    ) -> None:
        self.llm = self.get_llm(model, temperature, llm_api_key)
        self.embeddings = self.get_embeddings(model, embedding_api_key)
        self.vector_store_path = vector_store_path
        self.store = {}
        self.session_id = session_id
        self.project_path = project_path
        self.config = {"configurable": {"session_id": self.session_id}}
        self.chat_template = chat_template
        self.retriever = FAISS.load_local(
            self.vector_store_path,
            self.embeddings,
            allow_dangerous_deserialization=True,
        ).as_retriever()

        self.chain = self.get_conversational_chain()
    
    def get_session_ids(self):
        return len(self.store)
    
    def get_current_session_id(self):
        return self.session_id
    
    def get_llm(self, model, temperature, api_key):
        if model == "gemini-1.5-pro-latest":
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-pro-latest", temperature=temperature, google_api_key=api_key
            )
        elif model == "openai":
            llm = ChatOpenAI(
                model="gpt-4o",
                temperature=temperature,
                openai_api_key=api_key,
            )
        else:
            raise ValueError("Model not supported")
        return llm

    def get_embeddings(self, model, api_key):
        if model == "gemini-1.5-pro-latest":
            embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001", google_api_key=api_key
            )
        elif model == "openai":
            embeddings = OpenAIEmbeddings(
                model="text-embedding-3-large", openai_api_key=api_key
            )
        else:
            raise ValueError("Model not supported")
        return embeddings


    
    
    def save_messages_locally(self):
        if self.session_id not in self.store:
            return None
        
        local_history = {}
        for message in self.store[self.session_id].messages:
            if isinstance(message, AIMessage):
                prefix = "AI"
            else:
                prefix = "User"
            if prefix not in local_history:
                local_history[prefix] = []
            local_history[prefix].append(
                {
                    "id": message.id,
                    "message": message.content,
                }
            )
        
        with open(self.project_path + CHAT_HISTORY_DIR + self.session_id + "_chat_history.json", "w") as f:
            json.dump(local_history, f)
    
    
    def get_session_history(self) -> BaseChatMessageHistory:
        if self.session_id not in self.store:
            self.store[self.session_id] = ChatMessageHistory()
        return self.store[self.session_id]
    
    
    def change_session(self, session_id):
        self.session_id = session_id
        self.config = {"configurable": {"session_id": self.session_id}}
        self.session_changed = True
        logger.info(f"Session changed to {self.session_id}")
    
    def create_new_session(self):
        self.session_id = "session_" +  str(int(self.session_id.split("_")[1]) + 1)
        self.config = {"configurable": {"session_id": self.session_id}}
        self.session_changed = True
        logger.info("New session created with id: " + self.session_id)

    def get_conversational_chain(self):
        # Retriever setup
        retriever_template = (
            "Given a chat history and the latest user question which might reference context in the chat history,"
            "formulate a standalone question which can be understood without the chat history."
            "Do NOT answer the question, just reformulate it if needed and otherwise return it as is."
        )

        retriever_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", retriever_template),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
            ]
        )

        history_aware_retriever = create_history_aware_retriever(
            self.llm, self.retriever, retriever_prompt
        )

        # QA setup
        qa_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.chat_template),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
            ]
        )
        
        question_answer_chain = create_stuff_documents_chain(llm = self.llm, prompt=qa_prompt)

        chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

        self.main_chain = RunnableWithMessageHistory(
            chain,
            self.get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
            output_messages_key="answer",
        )
        return self.main_chain

    
    def process_user_input(self, question):
        response = self.chain.invoke(
            {"input": question},
            config=self.config,
        )["answer"]

        return response

    def chat(self, question=""):
        if question is None:
            question = input("Ask a question: ")

        if question == "/new_session":
            self.session_id = "session_" + str(len(self.store))
            self.config = {"configurable": {"session_id": self.session_id}}
            print("New session created")

        response = self.process_user_input(question)
        return response


if __name__ == "__main__":
    brain = ChatModel()
    vs = VectorStorePipeline()
    pdfs_path = "pdfs/"
    pdfs = vs.get_pdfs(pdfs_path)
    text = vs.get_pdf_text(pdfs)
    chunks = vs.get_text_chunks(text)
    vs.get_vector_store(chunks)

    print(brain.process_user_input("What is Advanced RAG?"))
