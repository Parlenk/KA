# AI Service for Creative Design Platform

FastAPI-based AI service providing image generation, background removal, text generation, and other AI-powered features for the Creative Design Platform.

## Features

### 🎨 Image Generation
- **Stable Diffusion XL** integration via Replicate API
- **7 Style Presets**: Realistic, Digital Art, 3D Model, Isometric, Pixel Art, Anime, Vaporwave
- **Batch Generation**: Up to 4 images per request
- **Custom Dimensions**: 256x256 to 2048x2048 pixels
- **Reference Images**: Use existing images as style references

### 🖼️ Background Processing
- **Background Removal**: One-click AI background removal
- **Background Generation**: AI-powered background replacement
- **Edge Refinement**: Intelligent edge cleanup
- **Batch Processing**: Handle multiple images

### ✍️ Text Generation
- **GPT-4 Integration**: High-quality copywriting
- **10 Tone Options**: Friendly, Professional, Casual, etc.
- **Multiple Formats**: Headlines, Body text, CTAs, Taglines
- **Bulk Generation**: Up to 10 variations per request

### 🔧 Additional Features
- **Image Upscaling**: Real-ESRGAN up to 4x scale
- **Object Removal**: Content-aware object deletion
- **Translation**: 100+ languages via DeepL
- **Rate Limiting**: Built-in API protection
- **Job Tracking**: Async operation monitoring

## Quick Start

### Prerequisites
- Python 3.11+
- API Keys for:
  - OpenAI (GPT-4)
  - Replicate (Stable Diffusion)
  - Remove.bg (optional)
  - DeepL (optional)

### Installation

1. **Clone and Setup**
   ```bash
   cd ai-service
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run Development Server**
   ```bash
   uvicorn src.main:app --reload --port 8000
   ```

4. **Access Documentation**
   - API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

### Docker Setup

```bash
# Build image
docker build -t kreativo-ai-service .

# Run container
docker run -p 8000:8000 --env-file .env kreativo-ai-service
```

## API Reference

### Image Generation

```bash
POST /api/v1/generate/images
Content-Type: application/json

{
  "prompt": "A modern office workspace with plants",
  "style": "realistic",
  "width": 1024,
  "height": 1024,
  "batch_size": 2
}
```

**Response:**
```json
{
  "images": [
    {
      "url": "https://...",
      "width": 1024,
      "height": 1024,
      "seed": 12345
    }
  ],
  "prompt": "A modern office workspace with plants",
  "style": "realistic",
  "job_id": "uuid-here"
}
```

### Background Removal

```bash
POST /api/v1/process/remove-background
Content-Type: application/json

{
  "image_url": "https://example.com/image.jpg",
  "edge_refinement": true
}
```

### Text Generation

```bash
POST /api/v1/generate/text
Content-Type: application/json

{
  "context": "Promote a new fitness app",
  "tone": "friendly",
  "format_type": "headline",
  "variation_count": 5
}
```

### Job Status

```bash
GET /api/v1/jobs/{job_id}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 | Required |
| `REPLICATE_API_TOKEN` | Replicate API token | Required |
| `REMOVEBG_API_KEY` | Remove.bg API key | Optional |
| `DEEPL_API_KEY` | DeepL translation API key | Optional |
| `MAX_IMAGE_SIZE` | Maximum image dimensions | 2048 |
| `MAX_BATCH_SIZE` | Maximum batch size | 4 |
| `MAX_REQUESTS_PER_MINUTE` | Rate limit | 60 |

### Style Presets

| Style | Description |
|-------|-------------|
| `realistic` | Photorealistic images |
| `digital-art` | Digital artwork style |
| `3d-model` | 3D rendered appearance |
| `isometric` | Isometric low-poly style |
| `pixel-art` | Retro 8-bit pixel art |
| `anime` | Anime/manga style |
| `vaporwave` | Synthwave aesthetic |

## Development

### Project Structure
```
ai-service/
├── src/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── models/
│   │   └── schemas.py       # Pydantic models
│   └── services/
│       ├── base.py          # Base service classes
│       ├── image_generation.py
│       ├── background_removal.py
│       ├── text_generation.py
│       └── translation.py
├── tests/                   # Test suite
├── requirements.txt         # Dependencies
├── Dockerfile              # Container config
└── README.md
```

### Adding New Services

1. **Create Service Class**
   ```python
   from .base import BaseAIService
   
   class MyAIService(BaseAIService):
       async def _setup(self):
           # Initialize your service
           pass
           
       async def health_check(self):
           # Implement health check
           return True
   ```

2. **Add API Endpoints**
   ```python
   @app.post("/api/v1/my-feature")
   async def my_endpoint(request: MyRequest):
       return await my_service.process(request)
   ```

3. **Register in Main App**
   ```python
   # Add to lifespan function
   await my_service.initialize()
   ```

### Testing

```bash
# Run tests
pytest tests/

# Run with coverage
pytest tests/ --cov=src

# Test specific service
pytest tests/test_image_generation.py -v
```

### Performance Optimization

- **Async Processing**: All operations are async
- **Connection Pooling**: HTTP clients reuse connections
- **Rate Limiting**: Prevents API abuse
- **Job Tracking**: Monitor long-running operations
- **Resource Cleanup**: Proper service shutdown

## Deployment

### Production Configuration

1. **Environment Setup**
   ```bash
   export ENVIRONMENT=production
   export DEBUG=false
   export LOG_LEVEL=INFO
   ```

2. **Docker Compose**
   ```yaml
   version: '3.8'
   services:
     ai-service:
       build: ./ai-service
       ports:
         - "8000:8000"
       env_file:
         - .env.production
       restart: unless-stopped
   ```

3. **Kubernetes Deployment**
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: ai-service
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: ai-service
     template:
       spec:
         containers:
         - name: ai-service
           image: kreativo-ai-service:latest
           ports:
           - containerPort: 8000
   ```

## Monitoring

### Health Checks
- **Endpoint**: `/health`
- **Dependencies**: Checks all external services
- **Metrics**: Service uptime, dependency status

### Logging
- **Format**: Structured JSON logs
- **Levels**: DEBUG, INFO, WARNING, ERROR
- **Context**: Job IDs, operation types, durations

### Metrics
- **Request Count**: API endpoint usage
- **Response Time**: Operation latency
- **Error Rate**: Failed requests percentage
- **Job Status**: Async operation tracking

## Troubleshooting

### Common Issues

1. **API Key Errors**
   ```
   ERROR: REPLICATE_API_TOKEN is required
   Solution: Add valid API token to .env file
   ```

2. **Rate Limit Exceeded**
   ```
   ERROR: Rate limit exceeded
   Solution: Reduce request frequency or increase limits
   ```

3. **Generation Timeout**
   ```
   ERROR: Generation timeout
   Solution: Check Replicate service status, increase timeout
   ```

4. **Memory Issues**
   ```
   ERROR: Out of memory
   Solution: Reduce batch size, add memory limits
   ```

### Debug Mode
```bash
export DEBUG=true
export LOG_LEVEL=DEBUG
uvicorn src.main:app --reload
```

## License

Part of the Creative Design Platform - See main project license.

## Support

- **Documentation**: `/docs` endpoint
- **Health Status**: `/health` endpoint  
- **API Reference**: `/redoc` endpoint

---

**Version**: 1.0.0  
**Last Updated**: January 2025