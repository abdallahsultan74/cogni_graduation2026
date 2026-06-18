import logging
import os

from flask import Flask, render_template
from flask_cors import CORS

from chatBot import chatbot_bp
from chatBot.utils import preload_models
from recommendation import recommendation_bp


logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

app.config["SECRET_KEY"] = os.environ.get("EELU_SECRET_KEY", "66ffb2ab897358aea90e01944324631c")

app.register_blueprint(recommendation_bp, url_prefix="/recommendation")
app.register_blueprint(chatbot_bp, url_prefix="/chatbot")


@app.route("/")
def home():
    return render_template("home.html")


@app.route("/health")
def health():
    return {"status": "OK"}, 200


# Preload models only when explicitly requested (production server) or as the main script.
# Tests and harness import `app` without paying the 30-60s startup cost.
def _should_preload():
    return os.environ.get("EELU_PRELOAD") == "1" or __name__ == "__main__"


if _should_preload():
    logger.info("Preloading models (this may take 30-60 seconds on first run)...")
    preload_models()
    logger.info("All models loaded successfully.")


if __name__ == "__main__":
    logger.info("Starting Flask server...")
    app.run(debug=True)
