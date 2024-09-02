import sys
import requests  # Add this import to handle HTTP requests
from langchain_community.vectorstores import Chroma
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain.schema.output_parser import StrOutputParser
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema.runnable import RunnablePassthrough
from langchain.prompts import PromptTemplate
from langchain_community.vectorstores.utils import filter_complex_metadata


class ChatPDF:
    vector_store = None
    retriever = None
    chain = None

    def __init__(self):
        self.model = ChatOllama(model="llama3")
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1024, chunk_overlap=100)
        self.prompt = PromptTemplate.from_template(
            """
            <s> [INST] You are an assistant for question-answering tasks. Use the following pieces of retrieved context 
            to answer the question. If you don't know the answer, just say that you don't know. Use three sentences
             maximum and keep the answer concise. [/INST] </s> 
            [INST] Question: {question} 
            Context: {context} 
            Answer: [/INST]
            """
        )

    def ingest(self, pdf_file_path: str):
        docs = PyPDFLoader(file_path=pdf_file_path).load()
        print("PDF loaded successfully.")
        
        chunks = self.text_splitter.split_documents(docs)
        print(f"PDF split into {len(chunks)} chunks.")
        
        chunks = filter_complex_metadata(chunks)
        print("Chunks filtered for complex metadata.")
        
        vector_store = Chroma.from_documents(documents=chunks, embedding=FastEmbedEmbeddings())
        print("Vector store created successfully.")

        self.retriever = vector_store.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={
                "k": 3,
                "score_threshold": 0.5,
            },
        )
        print("Retriever set up successfully.")
        
        self.chain = ({"context": self.retriever, "question": RunnablePassthrough()}
                    | self.prompt
                    | self.model
                    | StrOutputParser())
        print("Chain created successfully.")

        docs = PyPDFLoader(file_path=pdf_file_path).load()
        chunks = self.text_splitter.split_documents(docs)
        chunks = filter_complex_metadata(chunks)

        vector_store = Chroma.from_documents(documents=chunks, embedding=FastEmbedEmbeddings())
        self.retriever = vector_store.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={
                "k": 3,
                "score_threshold": 0.5,
            },
        )

        self.chain = ({"context": self.retriever, "question": RunnablePassthrough()}
                      | self.prompt
                      | self.model
                      | StrOutputParser())

    def ask(self, query: str):
        if not self.chain:
            return "Please, add a PDF document first."
        
        print("Running the model with a hardcoded prompt...")
        response = self.model.generate("What is this document about?")
        print("Model response:", response)
        return response

    def clear(self):
        self.vector_store = None
        self.retriever = None
        self.chain = None


if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_file_path = sys.argv[1]
        print("Starting PDF ingestion...")
        chat_pdf = ChatPDF()
        chat_pdf.ingest(pdf_file_path)
        print("PDF ingested successfully.")
        
        # Example question, modify as needed or pass through Node.js
        print("Asking the question...")
        response = chat_pdf.ask("What is this document about?")
        print("Response received: ", response)
        
        # Sending the response to the Node.js backend
        chat_id = "your-chat-id"  # Replace with the actual chatId or pass it through sys.argv
        backend_url = "http://localhost:5000/api/chats"  # Replace with your actual backend URL
        
        payload = {
            "chatId": chat_id,
            "user": "system",
            "message": response,
            "messageType": "response"
        }
        
        try:
            r = requests.post(backend_url, json=payload)
            if r.status_code == 200:
                print("Response sent to the backend successfully.")
            else:
                print(f"Failed to send response to backend. Status code: {r.status_code}")
        except Exception as e:
            print(f"Error sending response to backend: {str(e)}")
        
    else:
        print("No file path provided")
