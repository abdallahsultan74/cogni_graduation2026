#!/usr/bin/env python3
"""
Performance test script for the chatbot system
"""
import time
from chatBot.utils import process_query, preload_models

def test_performance():
    print("🚀 Testing chatbot performance...")
    
    # Test queries
    test_queries = [
        "What are the graduation requirements?",
        "How many credits do I need to graduate?",
        "What are the course registration rules?",
        "Can I take courses from other departments?",
        "What is the minimum GPA required?"
    ]
    
    print("\n📊 Running performance test...")
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n--- Test {i}: {query} ---")
        start_time = time.time()
        
        response = process_query(query)
        
        end_time = time.time()
        response_time = end_time - start_time
        
        print(f"⏱️  Response time: {response_time:.2f} seconds")
        print(f"📝 Response: {response[:100]}...")
    
    print(f"\n✅ Performance test completed!")

if __name__ == "__main__":
    # First, preload models
    print("🔄 Preloading models...")
    preload_models()
    
    # Then test performance
    test_performance() 