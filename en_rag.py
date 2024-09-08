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

#os.environ['OPENAI_API_KEY'] = "--check slack --"



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

Ensure that you filter out any inappropriate or offensive language in your response. Here's a list of words to avoid: {bad_words}

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
'''chat_completion = client.chat.completions.create(
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
    input_variables=["question", "context","bad_words"]
)
bad_words = [
    # General Offensive Language
    "fuck", "fucking", "shit", "asshole", "bitch", "bastard", "dick", "pussy", 
    "cunt", "cock", "dildo", "slut", "whore", "crap", "piss", "damn", "hell", 
    "jerk", "twat", "bollocks", "tosser", "wanker",

    # Racial Slurs
    "nigger", "chink", "gook", "spic", "wetback", "beaner", "cracker", "honky", 
    "paki", "gypsy", "coon", "jigaboo", "sandnigger", "kike",

    # Sexual Orientation and Gender Identity Slurs
    "faggot", "dyke", "tranny", "lesbo", "queer", "homo", "he-she", "shemale", "fudgepacker",

    # Religious Offense
    "infidel", "heathen", "blasphemy", "heretic", "jihadist", "terrorist", "zionist", 
    "crusader", "taliban", "kafir",

    # Derogatory Terms for Disabilities
    "retard", "cripple", "lame", "dumb", "spaz", "idiot", "moron", "lunatic",

    # Offensive Terms Regarding Appearance
    "fat", "ugly", "lardass", "tubby", "beanpole", "midget", "dwarf", "four-eyes",

    # Violent and Threatening Terms
    "kill", "die", "murder", "rape", "shoot", "stab", "bomb", "suicide", "lynch", 
    "execute", "terrorist", "massacre",

    # Offensive Terms About Mental Health
    "psycho", "nutjob", "crazy", "schizo", "maniac",

    # Miscellaneous Offensive Terms
    "garbage", "trash", "scum", "filth", "vermin", "loser", "scumbag", "degenerate", 
    "dirtbag", "slimeball", "harlot", "low-life"
]
def run_chat_completion(question, context, bad_words):
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": f"You are a helpful assistant. Ensure that the response filters out any offensive language using this list of words: {bad_words}."},
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
response = run_chat_completion(user_prompt, context,bad_words)

print("Assistant:", response)
