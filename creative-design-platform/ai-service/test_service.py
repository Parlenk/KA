#!/usr/bin/env python3
"""
Test script for AI Service functionality
Run this to verify all AI services are working correctly
"""
import asyncio
import httpx
import json
import time
from typing import Dict, Any


class AIServiceTester:
    """Test runner for AI Service endpoints"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=300.0)
        self.results: Dict[str, Any] = {}
    
    async def run_all_tests(self):
        """Run all available tests"""
        print("🚀 Starting AI Service Tests")
        print("=" * 50)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Service Info", self.test_service_info),
            ("Image Generation", self.test_image_generation),
            ("Text Generation", self.test_text_generation),
            ("Translation", self.test_translation),
            ("Job Status", self.test_job_status),
        ]
        
        for test_name, test_func in tests:
            print(f"\n📋 Running: {test_name}")
            try:
                result = await test_func()
                self.results[test_name] = {"status": "✅ PASS", "result": result}
                print(f"✅ {test_name}: PASSED")
            except Exception as e:
                self.results[test_name] = {"status": "❌ FAIL", "error": str(e)}
                print(f"❌ {test_name}: FAILED - {e}")
        
        await self.client.aclose()
        self.print_summary()
    
    async def test_health_check(self):
        """Test health check endpoint"""
        response = await self.client.get(f"{self.base_url}/health")
        
        if response.status_code != 200:
            raise Exception(f"Health check failed with status {response.status_code}")
        
        data = response.json()
        
        if data["status"] != "healthy":
            raise Exception(f"Service unhealthy: {data}")
        
        return data
    
    async def test_service_info(self):
        """Test service info endpoints"""
        # Test styles endpoint
        styles_response = await self.client.get(f"{self.base_url}/api/v1/info/styles")
        if styles_response.status_code != 200:
            raise Exception("Failed to get styles info")
        
        # Test limits endpoint
        limits_response = await self.client.get(f"{self.base_url}/api/v1/info/limits")
        if limits_response.status_code != 200:
            raise Exception("Failed to get limits info")
        
        return {
            "styles": styles_response.json(),
            "limits": limits_response.json()
        }
    
    async def test_image_generation(self):
        """Test image generation endpoint"""
        request_data = {
            "prompt": "A modern office workspace with plants, professional lighting",
            "style": "realistic",
            "width": 512,
            "height": 512,
            "batch_size": 1
        }
        
        print("   Generating image... (this may take 30-60 seconds)")
        response = await self.client.post(
            f"{self.base_url}/api/v1/generate/images",
            json=request_data
        )
        
        if response.status_code != 200:
            error_detail = response.json().get("detail", "Unknown error")
            raise Exception(f"Image generation failed: {error_detail}")
        
        data = response.json()
        
        if not data.get("images"):
            raise Exception("No images returned")
        
        return {
            "job_id": data["job_id"],
            "image_count": len(data["images"]),
            "prompt": data["prompt"]
        }
    
    async def test_text_generation(self):
        """Test text generation endpoint"""
        request_data = {
            "context": "Promote a new fitness app that helps people track workouts",
            "tone": "friendly",
            "format_type": "headline",
            "max_length": 50,
            "variation_count": 3
        }
        
        print("   Generating text...")
        response = await self.client.post(
            f"{self.base_url}/api/v1/generate/text",
            json=request_data
        )
        
        if response.status_code != 200:
            error_detail = response.json().get("detail", "Unknown error")
            raise Exception(f"Text generation failed: {error_detail}")
        
        data = response.json()
        
        if not data.get("variations"):
            raise Exception("No text variations returned")
        
        return {
            "job_id": data["job_id"],
            "variation_count": len(data["variations"]),
            "best_text": data["variations"][0]["text"],
            "confidence": data["variations"][0]["confidence_score"]
        }
    
    async def test_translation(self):
        """Test translation endpoint"""
        request_data = {
            "text": "Hello, welcome to our creative design platform!",
            "source_language": "en",
            "target_language": "es"
        }
        
        print("   Translating text...")
        response = await self.client.post(
            f"{self.base_url}/api/v1/translate",
            json=request_data
        )
        
        # Translation might fail if DeepL API key is not configured
        if response.status_code == 500:
            error_detail = response.json().get("detail", "")
            if "DeepL API not configured" in error_detail:
                print("   ⚠️  Translation skipped (DeepL API key not configured)")
                return {"status": "skipped", "reason": "API key not configured"}
            else:
                raise Exception(f"Translation failed: {error_detail}")
        
        if response.status_code != 200:
            error_detail = response.json().get("detail", "Unknown error")
            raise Exception(f"Translation failed: {error_detail}")
        
        data = response.json()
        
        return {
            "job_id": data["job_id"],
            "original_text": request_data["text"],
            "translated_text": data["translated_text"],
            "confidence": data["confidence_score"]
        }
    
    async def test_job_status(self):
        """Test job status endpoint"""
        # Use a job ID from previous tests if available
        job_id = None
        
        for test_name, result in self.results.items():
            if isinstance(result.get("result"), dict) and "job_id" in result["result"]:
                job_id = result["result"]["job_id"]
                break
        
        if not job_id:
            print("   ⚠️  No job ID available for status test")
            return {"status": "skipped", "reason": "No job ID available"}
        
        response = await self.client.get(f"{self.base_url}/api/v1/jobs/{job_id}")
        
        if response.status_code != 200:
            raise Exception(f"Job status check failed for job {job_id}")
        
        data = response.json()
        
        return {
            "job_id": job_id,
            "status": data["status"],
            "progress": data["progress"]
        }
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for r in self.results.values() if "PASS" in r["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {passed/total*100:.1f}%")
        
        print("\n📋 Detailed Results:")
        for test_name, result in self.results.items():
            print(f"  {result['status']} {test_name}")
            if "error" in result:
                print(f"      Error: {result['error']}")
            elif isinstance(result.get("result"), dict):
                for key, value in result["result"].items():
                    if key != "job_id":  # Skip job IDs for brevity
                        print(f"      {key}: {value}")
        
        print("\n🏁 Test completed!")
        
        if passed == total:
            print("🎉 All tests passed! AI Service is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the logs above for details.")


async def main():
    """Main test runner"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test AI Service functionality")
    parser.add_argument(
        "--url", 
        default="http://localhost:8000",
        help="AI Service base URL (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--verbose", 
        action="store_true",
        help="Enable verbose output"
    )
    
    args = parser.parse_args()
    
    # Test if service is running
    print(f"🔗 Testing AI Service at: {args.url}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{args.url}/")
            if response.status_code != 200:
                print(f"❌ Service not responding at {args.url}")
                print("💡 Make sure the AI service is running:")
                print("   cd ai-service && uvicorn src.main:app --reload")
                return
    except Exception as e:
        print(f"❌ Cannot connect to service: {e}")
        print("💡 Make sure the AI service is running:")
        print("   cd ai-service && uvicorn src.main:app --reload")
        return
    
    # Run tests
    tester = AIServiceTester(args.url)
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())