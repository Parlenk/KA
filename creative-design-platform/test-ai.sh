#\!/bin/bash
echo "🧪 Testing OpenAI Integration..."
curl -X POST "http://localhost:8000/ai/generate-text" \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Create a compelling tagline for Kredivo financial services",
       "tone": "professional",
       "max_length": 50,
       "variations": 1
     }'
