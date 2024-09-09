import json
import os
import logging
from flask import Flask, request, jsonify
from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from openai import OpenAI
from pymongo import MongoClient

app = Flask(__name__)
client = OpenAI()

# MongoDB setup
mongo_client = MongoClient('mongodb://localhost:27017/')
db = mongo_client['your_database_name']
image_collection = db['image_analysis']

# Initialize vectorstores
corporate_vectorstore = None
user_vectorstore = None

def initialize_corporate_vectorstore():
    global corporate_vectorstore
    file_paths = [
        "SIH/prd.pdf",
        "SIH/playbook.pdf",
        "SIH/it_support.PDF",
        "SIH/hr.pdf",
        "SIH/corp_events.pdf",
    ]
    pages = load_documents(file_paths)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=0)
    chunks = text_splitter.split_documents(pages)
    embedding = OpenAIEmbeddings(model="text-embedding-ada-002")
    corporate_vectorstore = Chroma.from_documents(documents=chunks, embedding=embedding)

def load_documents(file_paths):
    documents = []
    for file_path in file_paths:
        loader = PyPDFLoader(file_path)
        documents.extend(loader.load())
    return documents

def check_for_bad_words(text):
    # Implement your bad word checking logic here
    return None  # Return None if no bad words found, otherwise return an error message

@app.route("/upload", methods=["POST"])
def upload_pdf():
    global user_vectorstore
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        if file and file.filename.endswith('.pdf'):
            filename = os.path.join('user_uploads', file.filename)
            file.save(filename)
            
            loader = PyPDFLoader(filename)
            pages = loader.load()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=0)
            chunks = text_splitter.split_documents(pages)
            embedding = OpenAIEmbeddings(model="text-embedding-ada-002")
            
            if user_vectorstore is None:
                user_vectorstore = Chroma.from_documents(documents=chunks, embedding=embedding)
            else:
                user_vectorstore.add_documents(chunks)
            
            return jsonify({"message": "File uploaded and processed successfully"}), 200
        else:
            return jsonify({"error": "Invalid file format. Please upload a PDF."}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/ask", methods=["POST"]) 
def ask_question():
    try:
        user_input = request.json.get("question")
        bad_language_message = check_for_bad_words(user_input)
        
        if bad_language_message:
            return jsonify({"error": bad_language_message}), 400

        answer_found = False
        response_text = ""

        # 1. Search in corporate data
        if corporate_vectorstore:
            docs = corporate_vectorstore.similarity_search(user_input, k=3)
            if docs:
                context = "\n".join([doc.page_content for doc in docs])
                result = get_ai_response(context, user_input)
                
                if result['confidence'] > 0.5:
                    answer_found = True
                    response_text = f"Answer from corp data (confidence: {result['confidence']}): {result['answer']}"

        # 2. If no answer from corp data, search in user-uploaded data
        if not answer_found and user_vectorstore:
            docs = user_vectorstore.similarity_search(user_input, k=3)
            if docs:
                context = "\n".join([doc.page_content for doc in docs])
                result = get_ai_response(context, user_input)
                
                if result['confidence'] > 0.5:
                    answer_found = True
                    response_text = f"Answer from user data (confidence: {result['confidence']}): {result['answer']}"

        # 3. If no answer from both text sources, try to answer from image analysis
        if not answer_found:
            relevant_images = list(image_collection.find().sort("_id", -1).limit(5))
            if relevant_images:
                image_descriptions = [img['analysis'] for img in relevant_images]
                combined_context = "\n".join(image_descriptions)
                result = get_ai_response(combined_context, user_input)
                
                if result['confidence'] > 0.5:
                    answer_found = True
                    response_text = f"Answer from image analysis (confidence: {result['confidence']}): {result['answer']}"

        # 4. If no answer is found from all methods, return default message
        if not answer_found:
            response_text = "I don't have enough confident information to answer this question."

        return jsonify({"response": response_text})
    except Exception as e:
        logging.error(f"Error in ask_question endpoint: {str(e)}")
        return jsonify({"error": "An error occurred while processing your request"}), 500

def get_ai_response(context, question):
    messages = [
        {"role": "system", "content": """You are a helpful assistant. Answer the question using the provided context. 
        Along with your answer, provide a confidence score between 0 and 1, where 0 means you're not at all confident and 1 means you're absolutely certain.
        Format your response as JSON with 'answer' and 'confidence' fields.
        If you cannot find a relevant answer based on the given context, set the confidence to 0.
        Ensure that you filter out any inappropriate or offensive language in your response."""},
        {"role": "user", "content": f"Context: {context}\n\nQuestion: {question}"}
    ]
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        max_tokens=300,
    )
    return json.loads(response.choices[0].message.content)

if __name__ == "__main__":
    initialize_corporate_vectorstore()
    app.run(debug=True)
