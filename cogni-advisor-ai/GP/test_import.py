#!/usr/bin/env python3
"""
Test script to verify models load when app is imported
"""
import time

print("🧪 Testing model loading on import...")
print("=" * 40)

start_time = time.time()

# Import the app (this should trigger model loading)
print("📥 Importing app...")
from app import app

end_time = time.time()
import_time = end_time - start_time

print("=" * 40)
print(f"✅ App imported successfully in {import_time:.2f} seconds")
print("🎯 Models should now be loaded and ready!")

# Test if models are actually loaded
print("\n🧪 Testing if models are loaded...")
from chatBot.utils import _embeddings, _retriever, _vector_store

if _embeddings is not None:
    print("✅ Embeddings model is loaded")
else:
    print("❌ Embeddings model is NOT loaded")

if _retriever is not None:
    print("✅ Retriever is loaded")
else:
    print("❌ Retriever is NOT loaded")

if _vector_store is not None:
    print("✅ Vector store is loaded")
else:
    print("❌ Vector store is NOT loaded")

print("\n🎉 Test completed!") 