#\!/bin/bash
echo "🚀 Starting Kredivo Ads AI Service with your OpenAI API key..."
cd "$(dirname "$0")/ai-service"
source venv/bin/activate
python simple_main.py
