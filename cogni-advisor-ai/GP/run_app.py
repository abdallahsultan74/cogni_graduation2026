#!/usr/bin/env python3
"""
Simple startup script for the Cogni Advisor system.
"""
import os
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

def main():
    print("🎓 Cogni Advisor")
    print("=" * 40)
    print()
    
    # Check if required files exist
    required_files = [
        "app.py",
        "chatBot/",
        "recommendation/",
        "templates/",
        "static/"
    ]
    
    print("📋 Checking system files...")
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - Missing!")
            return False
    
    # Hugging Face Spaces usually provides PORT; keep EELU_PORT for local/dev compatibility.
    port = int(os.environ.get("PORT") or os.environ.get("EELU_PORT", "7860"))
    host = os.environ.get("EELU_HOST", "0.0.0.0")

    print()
    print("🚀 Starting the application...")
    print("⏱️  Models will load automatically during startup")
    print("✅ Once loaded, all questions will be fast!")
    print()
    print(f"🌐 Server will start at: http://localhost:{port}")
    print(f"📱 Chatbot available at: http://localhost:{port}/chatbot/chatbot")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 40)

    # Import and run the Flask app
    try:
        os.environ.setdefault("EELU_PRELOAD", "1")
        from app import app
        app.run(
            debug=os.environ.get("FLASK_DEBUG", "0") == "1",
            host=host,
            port=port,
            use_reloader=False,
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
