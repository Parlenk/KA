"""
Simple AI Service for OpenAI Integration
Focused on text generation with your OpenAI API key
"""

import os
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Kredivo Ads AI Service",
    description="AI service for text generation using OpenAI GPT-4",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    client = OpenAI(api_key=openai_api_key)
    print("✅ OpenAI API key loaded successfully")
else:
    print("⚠️ OpenAI API key not found in environment variables")
    client = None

# Pydantic models
class TextGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Text generation prompt")
    tone: str = Field(default="professional", description="Tone of voice")
    max_length: int = Field(default=100, description="Maximum text length")
    variations: int = Field(default=1, description="Number of variations")

class TextGenerationResult(BaseModel):
    texts: List[str]
    tone: str
    prompt: str

class AIResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    processing_time: float

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "openai": bool(openai_api_key and client),
        }
    }

@app.post("/ai/generate-text", response_model=AIResponse)
async def generate_text_endpoint(request: TextGenerationRequest):
    """AI text generation using OpenAI GPT-4"""
    start_time = datetime.now()
    
    if not client:
        return AIResponse(
            success=False,
            error="OpenAI API key not configured",
            processing_time=(datetime.now() - start_time).total_seconds()
        )
    
    try:
        # Define tone prompts
        tone_prompts = {
            "professional": "Write in a professional, business-appropriate tone.",
            "friendly": "Write in a warm, friendly, and approachable tone.",
            "confident": "Write in a confident, assertive tone.",
            "casual": "Write in a casual, conversational tone.",
            "formal": "Write in a formal, sophisticated tone.",
            "optimistic": "Write in an optimistic, positive tone.",
            "serious": "Write in a serious, authoritative tone.",
            "humorous": "Write in a light, humorous tone.",
            "emotional": "Write in an emotional, compelling tone.",
            "assertive": "Write in a strong, assertive tone."
        }
        
        system_prompt = f"""You are a professional copywriter for advertising and marketing materials. 
        {tone_prompts.get(request.tone, tone_prompts['professional'])}
        Keep responses under {request.max_length} characters and make them compelling for advertising use.
        Focus on creating engaging, actionable content that drives results."""
        
        print(f"🤖 Generating text with prompt: '{request.prompt}' in {request.tone} tone")
        
        # Generate text using OpenAI
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.prompt}
            ],
            max_tokens=request.max_length // 2,
            temperature=0.8,
            n=request.variations
        )
        
        # Extract generated texts
        texts = [choice.message.content.strip() for choice in response.choices if choice.message.content]
        
        if not texts:
            return AIResponse(
                success=False,
                error="No text generated",
                processing_time=(datetime.now() - start_time).total_seconds()
            )
        
        result_data = {
            "texts": texts,
            "tone": request.tone,
            "prompt": request.prompt
        }
        
        processing_time = (datetime.now() - start_time).total_seconds()
        print(f"✅ Generated {len(texts)} text(s) in {processing_time:.2f}s")
        
        return AIResponse(
            success=True,
            data=result_data,
            processing_time=processing_time
        )
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Text generation failed: {error_msg}")
        
        # Provide fallback responses for common errors
        if "rate_limit" in error_msg.lower():
            fallback_texts = [
                f"Professional {request.tone} content for your brand",
                f"Engaging {request.tone} message that converts",
                f"Compelling {request.tone} copy for your audience"
            ]
        else:
            fallback_texts = [
                "Unlock Your Financial Future with Kredivo",
                "Smart Credit Solutions for Modern Living",
                "Your Trusted Partner in Financial Growth"
            ]
        
        return AIResponse(
            success=True,  # Return success with fallback
            data={
                "texts": fallback_texts[:request.variations],
                "tone": request.tone,
                "prompt": request.prompt,
                "fallback": True,
                "fallback_reason": error_msg
            },
            processing_time=(datetime.now() - start_time).total_seconds()
        )

if __name__ == "__main__":
    print("🚀 Starting Simple Kredivo Ads AI Service")
    print("💡 Available Features:")
    print("   • GPT-4 Text Generation")
    print("   • Professional Marketing Copy")
    print("   • Multiple Tone Options")
    print("   • Fallback Responses")
    print()
    
    if openai_api_key:
        print("🔑 OpenAI API Key: ✅ Configured")
    else:
        print("🔑 OpenAI API Key: ❌ Missing - Add to .env file")
        print("   OPENAI_API_KEY=your_key_here")
    
    print()
    print("🌐 Service will be available at: http://localhost:8000")
    print("📖 API docs: http://localhost:8000/docs")
    print("🔍 Health check: http://localhost:8000/health")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")