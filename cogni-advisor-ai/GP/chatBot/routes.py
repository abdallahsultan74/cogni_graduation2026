from flask import render_template, request, session, jsonify
from .utils import process_query
from . import chatbot_bp

@chatbot_bp.route('/chatbot', methods=['GET', 'POST'])
def chat():
    # Initialize session for storing chat history
    if 'messages' not in session:
        session['messages'] = []

    if request.method == 'POST':
        query = request.form['query'].strip()
        if query:
            # Add user message to history
            session['messages'].append({'role': 'user', 'content': query})
            # Process query and get response
            response = process_query(query)
            # Add bot response to history
            session['messages'].append({'role': 'bot', 'content': response})
            # Mark session as modified
            session.modified = True

    # Render template with chat history
    return render_template('chatbot.html', messages=session['messages'])

# Endpoint
@chatbot_bp.route('/api/ask', methods=['POST'])
def ask_question():
    try:
        data = request.get_json() or {}
        question = data.get("question", "").strip()
        student_context = data.get("student_context")

        if not question:
            return jsonify({"error": "No question provided"}), 400

        answer = process_query(question, student_context)
        print("The Chatbot Answer: ", answer)
        return jsonify({"answer": answer}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500