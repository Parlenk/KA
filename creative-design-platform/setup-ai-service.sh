#\!/bin/bash

# Kredivo Ads AI Service Setup Script
# Sets up the best AI resizer with Real-ESRGAN and other professional AI features

echo "🚀 Setting up Kredivo Ads AI Service with Best AI Resizer"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Python 3.8+ is installed
echo -e "${BLUE}🔍 Checking Python version...${NC}"
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version 2>&1 | cut -d" " -f2)
    echo -e "${GREEN}✅ Python ${python_version} found${NC}"
else
    echo -e "${RED}❌ Python 3.8+ is required but not found${NC}"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

# Check if pip is installed
echo -e "${BLUE}🔍 Checking pip...${NC}"
if command -v pip3 &> /dev/null; then
    echo -e "${GREEN}✅ pip3 found${NC}"
else
    echo -e "${RED}❌ pip3 not found${NC}"
    echo "Please install pip3"
    exit 1
fi

# Create virtual environment
echo -e "${BLUE}🏗️  Creating Python virtual environment...${NC}"
cd "$(dirname "$0")/ai-service"
if [ \! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${YELLOW}⚠️  Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}🔧 Activating virtual environment...${NC}"
source venv/bin/activate

# Upgrade pip
echo -e "${BLUE}⬆️  Upgrading pip...${NC}"
pip install --upgrade pip

# Install requirements
echo -e "${BLUE}📦 Installing AI service requirements...${NC}"
echo "This may take a few minutes as it downloads AI models..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All Python packages installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install some packages${NC}"
    echo "You may need to install additional system dependencies"
fi

# Check if Redis is available (optional)
echo -e "${BLUE}🔍 Checking Redis (optional for caching)...${NC}"
if command -v redis-server &> /dev/null; then
    echo -e "${GREEN}✅ Redis found - caching will be available${NC}"
else
    echo -e "${YELLOW}⚠️  Redis not found - AI service will work without caching${NC}"
    echo "To install Redis: brew install redis (macOS) or apt-get install redis-server (Ubuntu)"
fi

# Create .env file if it doesn't exist
echo -e "${BLUE}🔑 Setting up environment configuration...${NC}"
cd ..
if [ \! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created from template${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env file and add your API keys:${NC}"
    echo "   • OPENAI_API_KEY (for GPT-4 text generation)"
    echo "   • REPLICATE_API_TOKEN (for Real-ESRGAN AI resizing)"
    echo "   • REMOVE_BG_API_KEY (for background removal)"
    echo "   • DEEPL_API_KEY (for translation)"
else
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
fi

# Create startup script
echo -e "${BLUE}📝 Creating startup scripts...${NC}"
cat > start-ai-service.sh << 'SCRIPT_EOF'
#\!/bin/bash
echo "🚀 Starting Kredivo Ads AI Service..."
cd ai-service
source venv/bin/activate
python main.py
SCRIPT_EOF

chmod +x start-ai-service.sh

cat > start-frontend.sh << 'SCRIPT_EOF'
#\!/bin/bash
echo "🖥️  Starting Frontend Development Server..."
cd frontend
npm run dev
SCRIPT_EOF

chmod +x start-frontend.sh

echo -e "${GREEN}✅ Setup completed successfully\!${NC}"
echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "1. Edit the .env file and add your API keys"
echo "2. Start Redis (optional): redis-server"
echo "3. Start AI service: ./start-ai-service.sh"
echo "4. Start frontend: ./start-frontend.sh"
echo ""
echo -e "${BLUE}🔑 Required API Keys:${NC}"
echo "• OpenAI API Key: https://platform.openai.com/api-keys"
echo "• Replicate Token: https://replicate.com/account/api-tokens" 
echo "• Remove.bg Key: https://www.remove.bg/api"
echo "• DeepL Key: https://www.deepl.com/api-contact"
echo ""
echo -e "${GREEN}🎨 Features Available:${NC}"
echo "• Best AI Resizer (Real-ESRGAN)"
echo "• Professional Background Removal"
echo "• GPT-4 Text Generation"
echo "• Image Upscaling & Enhancement"
echo "• Smart Canvas Resizing"
echo ""
echo -e "${BLUE}💡 The AI service will run on: http://localhost:8000${NC}"
echo -e "${BLUE}💡 The frontend will run on: http://localhost:3001${NC}"
EOF < /dev/null