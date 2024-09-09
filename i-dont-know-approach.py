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
                {"role": "system", "content": """You are a helpful assistant. Answer the question using the provided context from corporate documents. 
                If you cannot find a relevant or confident answer based on the given context, respond with exactly 'I don't have enough information to answer this question.' 
                Ensure that you filter out any inappropriate or offensive language in your response."""},
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {user_input}"}
            ]
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                max_tokens=300,
            )
            answer = response.choices[0].message.content
            
            if answer != "I don't have enough information to answer this question.":
                answer_found = True
                response_text = "Answer from corp data: " + answer

        # 2. If no answer from corp data, try to answer from image analysis
        if not answer_found:
            relevant_images = list(image_collection.find().sort("_id", -1).limit(5))
            if relevant_images:
                image_descriptions = [img['analysis'] for img in relevant_images]
                combined_context = "\n".join(image_descriptions)
                messages = [
                    {"role": "system", "content": """You are a helpful assistant. Answer the question using the provided image descriptions. 
                    If you cannot find a relevant or confident answer based on the given context, respond with exactly 'I don't have enough information to answer this question.' 
                    Ensure that you filter out any inappropriate or offensive language in your response."""},
                    {"role": "user", "content": f"Image descriptions:\n{combined_context}\n\nQuestion: {user_input}"}
                ]
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=messages,
                    max_tokens=300,
                )
                answer = response.choices[0].message.content
                
                if answer != "I don't have enough information to answer this question.":
                    answer_found = True
                    response_text = "Answer from image analysis: " + answer

        # 3. If no answer is found from both methods, return default message
        if not answer_found:
            response_text = "I don't have enough information to answer this question."

        return jsonify({"response": response_text})
    except Exception as e:
        logging.error(f"Error in ask_question endpoint: {str(e)}")
        return jsonify({"error": "An error occurred while processing your request"}), 500
