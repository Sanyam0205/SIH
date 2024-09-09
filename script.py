from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import os
import re
from pymongo import MongoClient
from openai import OpenAI
import io
import base64
import uuid
import logging
import requests
from bs4 import BeautifulSoup
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Chroma


app = Flask(__name__)
CORS(app)

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# MongoDB Setup
mongo_client = MongoClient("mongodb://localhost:27017/")
db = mongo_client['chat_history_db']
chat_collection = db['chats']
image_collection = db['images']

# Path to save uploaded images
UPLOAD_FOLDER = 'D:/projects/SIH/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Set up OpenAI API Key


client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

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


def check_for_bad_words(user_input):
    if any(word in user_input.lower() for word in bad_words):
        return "Input blocked: Inappropriate language detected!"
    return None

def censor_bad_words(user_input):
    return re.sub('|'.join(map(re.escape, bad_words)), lambda m: '*' * len(m.group()), user_input, flags=re.IGNORECASE)

# Function to save image and return base64 data
def save_image_and_get_base64(file):
    try:
        image_id = str(uuid.uuid4())
        file_extension = file.filename.split('.')[-1]
        image_filename = f"{image_id}.{file_extension}"
        image_path = os.path.join(UPLOAD_FOLDER, image_filename)
        
        # Save the image
        file.save(image_path)
        
        # Read the image and convert to base64
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
        return f"data:image/{file_extension};base64,{encoded_string}", image_path
    except Exception as e:
        logging.error(f"Error in save_image_and_get_base64: {str(e)}")
        raise

def load_documents(file_paths):
    all_pages = []
    for file_path in file_paths:
        loader = PyPDFLoader(file_path)
        pages = loader.load()
        all_pages.extend(pages)
    return all_pages

# OCR Endpoint
@app.route('/ocr', methods=['POST'])
def ocr():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Save image and get base64 data
        image_data, image_path = save_image_and_get_base64(file)
        
        # Use OpenAI's vision model to analyze the image
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "What is shown in this image? Provide a detailed description."},
                        {"type": "image_url", "image_url": {"url": image_data}}
                    ],
                }
            ],
            max_tokens=300,
        )
        
        analysis = response.choices[0].message.content
        
        # Save image data to MongoDB
        image_data = {
            "filename": file.filename,
            "image_path": image_path,
            "analysis": analysis
        }
        image_collection.insert_one(image_data)

        return jsonify({'analysis': analysis}), 200
    except Exception as e:
        logging.error(f"Error in OCR endpoint: {str(e)}")
        return jsonify({'error': 'An error occurred during image processing'}), 500

# Chat Endpoint
@app.route("/ask", methods=["POST"])
def ask_question():
    try:
        user_input = request.json.get("question")
        bad_language_message = check_for_bad_words(user_input)
        
        if bad_language_message:
            return jsonify({"error": bad_language_message}), 400

        # 1. Search in corporate data
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
        vectorstore = Chroma.from_documents(documents=chunks, embedding=embedding)

        docs = vectorstore.similarity_search(user_input, k=3)
        if docs:
            context = "\n".join([doc.page_content for doc in docs])
            messages = [
                {"role": "system", "content": "You are a helpful assistant. Answer the question using the provided context from corporate documents. Ensure that you filter out any inappropriate or offensive language in your response."},
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {user_input}"}
            ]
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                max_tokens=300,
            )
            answer = response.choices[0].message.content
            return jsonify({"response": "Answer from corp data: " + answer})

        # 2. Try to answer from image analysis
        relevant_images = list(image_collection.find().sort("_id", -1).limit(5))
        if relevant_images:
            image_descriptions = [img['analysis'] for img in relevant_images]
            combined_context = "\n".join(image_descriptions)
            
            messages = [
                {"role": "system", "content": "You are a helpful assistant. Answer the question using the provided image descriptions. Ensure that you filter out any inappropriate or offensive language in your response."},
                {"role": "user", "content": f"Image descriptions:\n{combined_context}\n\nQuestion: {user_input}"}
            ]

            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                max_tokens=300,
            )
            answer = response.choices[0].message.content
            
            if "I don't have enough information" not in answer.lower():
                return jsonify({"response": "Answer from user data: " + answer})

        # 3. If no corporate data or image answer, indicate that the assistant doesn't have enough information
        return jsonify({"response": "I'm sorry, I don't have enough information to answer your question."})
    except Exception as e:
        logging.error(f"Error in ask_question endpoint: {str(e)}")
        return jsonify({"error": "An error occurred while processing your request"}), 500
    
if __name__ == '__main__':
    app.run(debug=True)