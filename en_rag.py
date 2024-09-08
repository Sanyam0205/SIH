#! pip -q install langchain chromadb PyMuPDF langchain_community 
#pip -q install langchain-openai

import openai
from openai import OpenAI 
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.prompts import PromptTemplate

import os

# os.environ['OPENAI_API_KEY'] = " -- check slack -- "



def load_documents(file_paths):
    all_pages = []
    for file_path in file_paths:
        loader = PyPDFLoader(file_path)
        pages = loader.load()
        all_pages.extend(pages)
    return all_pages


file_paths = [
    "/Users/manya/Desktop/hr.pdf",
    "/Users/manya/Desktop/it_support.pdf",
    "/Users/manya/Desktop/prd.pdf",
    "/Users/manya/Desktop/corp_events.pdf",
    "/Users/manya/Desktop/playbook.pdf",
]

pages = load_documents(file_paths)


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=0,
)
chunks = text_splitter.split_documents(pages)

embedding = OpenAIEmbeddings(model="text-embedding-ada-002")  # Ensure it's a valid embedding model


vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embedding
)


template = '''
Use the following context to answer the question at the end. Provide the answers in detail.
If you don't know the answer, just say that you don't know. DO NOT try to make up an answer.

{context}
Question: {question}
Answer:
'''
'''
import os
from openai import OpenAI



'''
client = OpenAI(
   
    api_key=os.environ.get("OPENAI_API_KEY"),
)
'''
chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": "Say this is a test",
        }
    ],
    model="gpt-3.5-turbo",
)'''
QA_CHAIN_PROMPT = PromptTemplate(
    template=template,
    input_variables=["question", "context"]
)

def run_chat_completion(question, context):
    response = client.chat.completions.create(
        model="gpt-4",  # Use a valid model
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": f"Context: {context}\n\nQuestion: {question}"}
        ]
    )
    return response.choices[0].message.content
#message = completion.choices[0].message.content

def get_context_from_vectorstore(query):
    retriever = vectorstore.as_retriever()
    docs = retriever.get_relevant_documents(query)
    return "\n\n".join([doc.page_content for doc in docs])


user_prompt = input("User: ")

context = get_context_from_vectorstore(user_prompt)
response = run_chat_completion(user_prompt, context)

print("Assistant:", response)
