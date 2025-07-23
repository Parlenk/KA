"""
Advanced Background Removal and Processing Service
Phase 3: Enhanced with multiple AI models, smart object detection, and advanced compositing
"""
import asyncio
import httpx
import time
import cv2
from typing import Optional, Union, List, Dict, Any, Tuple
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
import io
import base64
import numpy as np
from rembg import remove, new_session
import torch
from segment_anything import SamPredictor, sam_model_registry
from transformers import DetrImageProcessor, DetrForObjectDetection

from .base import BaseAIService, job_tracker
from ..models.schemas import (
    BackgroundRemovalRequest,
    BackgroundRemovalResponse,
    BackgroundGenerationRequest,
    BackgroundGenerationResponse,
    ObjectRemovalRequest,
    ObjectRemovalResponse
)
from ..config import settings


class BackgroundRemovalService(BaseAIService):
    """Enhanced AI-powered background removal and processing service with advanced features"""
    
    def __init__(self):
        super().__init__()
        self.removebg_client: Optional[httpx.AsyncClient] = None
        self.rembg_session = None
        self.use_removebg = False
        
        # Enhanced AI models for Phase 3
        self.sam_predictor: Optional[SamPredictor] = None
        self.sam_model = None
        self.detr_processor: Optional[DetrImageProcessor] = None
        self.detr_model: Optional[DetrForObjectDetection] = None
        
        # Advanced processing capabilities
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.supported_models = [
            "u2net",          # Universal model
            "u2net_human_seg", # Human segmentation
            "u2net_cloth_seg", # Clothing segmentation
            "isnet-general-use", # High-quality general use
            "silueta",       # Portrait segmentation
            "sam_vit_h_4b8939" # Segment Anything Model
        ]
    
    async def _setup(self) -> None:
        """Initialize the enhanced background removal service with Phase 3 capabilities"""
        # Setup Remove.bg API client if API key is available
        if settings.removebg_api_key:
            self.removebg_client = httpx.AsyncClient(
                base_url="https://api.remove.bg/v1.0",
                headers={
                    "X-Api-Key": settings.removebg_api_key
                },
                timeout=httpx.Timeout(60.0)
            )
            self.use_removebg = True
            self.logger.info("Remove.bg API configured")
        
        # Initialize local rembg models
        try:
            self.rembg_session = new_session('u2net')  # Universal model
            self.logger.info("Local rembg model loaded")
        except Exception as e:
            self.logger.warning(f"Failed to load local rembg model: {e}")
        
        # Initialize Segment Anything Model (SAM) for advanced segmentation
        try:
            sam_checkpoint = "sam_vit_h_4b8939.pth"  # Download if needed
            model_type = "vit_h"
            
            if torch.cuda.is_available():
                self.sam_model = sam_model_registry[model_type](checkpoint=sam_checkpoint)
                self.sam_model.to(device=self.device)
                self.sam_predictor = SamPredictor(self.sam_model)
                self.logger.info("SAM model loaded successfully")
            else:
                self.logger.warning("CUDA not available, SAM model not loaded")
        except Exception as e:
            self.logger.warning(f"Failed to load SAM model: {e}")
        
        # Initialize DETR for object detection
        try:
            self.detr_processor = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
            self.detr_model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
            self.detr_model.to(self.device)
            self.logger.info("DETR object detection model loaded")
        except Exception as e:
            self.logger.warning(f"Failed to load DETR model: {e}")
        
        await self.health_check()
    
    async def health_check(self) -> bool:
        """Check if the enhanced background removal service is healthy"""
        try:
            # Test Remove.bg API if configured
            if self.use_removebg and self.removebg_client:
                response = await self.removebg_client.get("/account")
                if response.status_code != 200:
                    self.logger.warning("Remove.bg API health check failed")
            
            # Check available methods
            methods_available = [
                self.use_removebg,
                self.rembg_session is not None,
                self.sam_predictor is not None,
                self.detr_model is not None
            ]
            
            # At least one method should be available
            return any(methods_available)
            
        except Exception as e:
            self.logger.error("Health check failed", error=str(e))
            return self.rembg_session is not None
    
    async def remove_background(self, request: BackgroundRemovalRequest) -> BackgroundRemovalResponse:
        """Remove background from image"""
        job_id = self.generate_job_id()
        start_time = time.time()
        
        try:
            # Create job tracking
            job_tracker.create_job(
                job_id=job_id,
                operation="background_removal",
                image_url=request.image_url,
                edge_refinement=request.edge_refinement
            )
            
            await self._log_job_start(
                job_id, "background_removal",
                image_url=request.image_url
            )
            
            job_tracker.set_job_processing(job_id, 10.0)
            
            # Download source image
            source_image = await self._download_image(request.image_url)
            job_tracker.set_job_processing(job_id, 30.0)
            
            # Process image with smart background removal
            result_image = await self._smart_background_removal(
                source_image, 
                getattr(request, 'content_type', 'auto')
            )
            
            job_tracker.set_job_processing(job_id, 80.0)
            
            # Save result (implement storage logic)
            result_url = await self._save_image(result_image, f"bg_removed_{job_id}")
            
            # Create response
            response_data = BackgroundRemovalResponse(
                result_url=result_url,
                original_url=request.image_url,
                job_id=job_id
            )
            
            job_tracker.set_job_completed(job_id, result_url)
            
            duration = time.time() - start_time
            await self._log_job_complete(job_id, "background_removal", duration)
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            await self._log_job_error(job_id, "background_removal", e)
            raise
    
    async def _remove_bg_api(self, image: Image.Image, edge_refinement: bool) -> Image.Image:
        """Remove background using Remove.bg API"""
        if not self.removebg_client:
            raise ValueError("Remove.bg API not configured")
        
        # Convert image to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # API request parameters
        data = {
            "size": "auto",
            "type": "auto"
        }
        
        if edge_refinement:
            data["crop"] = "true"
            data["add_shadow"] = "false"
        
        files = {
            "image_file": img_byte_arr.getvalue()
        }
        
        # Make API request
        response = await self.removebg_client.post(
            "/removebg",
            data=data,
            files=files
        )
        
        if response.status_code != 200:
            error_msg = response.json().get("errors", [{}])[0].get("title", "API error")
            raise Exception(f"Remove.bg API error: {error_msg}")
        
        # Convert response to PIL Image
        result_image = Image.open(io.BytesIO(response.content))
        return result_image
    
    async def _remove_bg_local(self, image: Image.Image, model_type: str = "u2net") -> Image.Image:
        """Remove background using local rembg model with enhanced options"""
        if not self.rembg_session:
            raise ValueError("Local background removal model not available")
        
        # Use different models based on content type
        if model_type not in self.supported_models:
            model_type = "u2net"
        
        # Create session for specific model if different
        session = self.rembg_session
        if model_type != "u2net":
            try:
                session = new_session(model_type)
            except Exception as e:
                self.logger.warning(f"Failed to load {model_type}, using default: {e}")
                session = self.rembg_session
        
        # Convert PIL to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Process with rembg (run in thread pool to avoid blocking)
        loop = asyncio.get_event_loop()
        result_bytes = await loop.run_in_executor(
            None, 
            lambda: remove(img_byte_arr.getvalue(), session=session)
        )
        
        # Convert back to PIL Image
        result_image = Image.open(io.BytesIO(result_bytes))
        return result_image
    
    async def _remove_bg_sam(self, image: Image.Image, prompt_points: List[Tuple[int, int]], prompt_labels: List[int]) -> Image.Image:
        """Remove background using Segment Anything Model (SAM) with interactive prompts"""
        if not self.sam_predictor:
            raise ValueError("SAM model not available")
        
        # Convert PIL to numpy array
        image_array = np.array(image)
        
        # Set image for SAM predictor
        self.sam_predictor.set_image(image_array)
        
        # Convert prompt points and labels to numpy arrays
        input_points = np.array(prompt_points)
        input_labels = np.array(prompt_labels)
        
        # Generate mask using SAM
        masks, scores, logits = self.sam_predictor.predict(
            point_coords=input_points,
            point_labels=input_labels,
            multimask_output=True
        )
        
        # Select the best mask (highest score)
        best_mask_idx = np.argmax(scores)
        mask = masks[best_mask_idx]
        
        # Apply mask to create transparent background
        result_array = image_array.copy()
        if len(result_array.shape) == 2:  # Grayscale
            result_array = cv2.cvtColor(result_array, cv2.COLOR_GRAY2RGBA)
        elif result_array.shape[2] == 3:  # RGB
            result_array = cv2.cvtColor(result_array, cv2.COLOR_RGB2RGBA)
        
        # Set alpha channel based on mask
        result_array[:, :, 3] = mask.astype(np.uint8) * 255
        
        # Convert back to PIL Image
        result_image = Image.fromarray(result_array, 'RGBA')
        return result_image
    
    async def _detect_objects(self, image: Image.Image) -> List[Dict[str, Any]]:
        """Detect objects in image using DETR"""
        if not self.detr_processor or not self.detr_model:
            return []
        
        try:
            # Preprocess image
            inputs = self.detr_processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Run inference
            with torch.no_grad():
                outputs = self.detr_model(**inputs)
            
            # Process results
            target_sizes = torch.tensor([image.size[::-1]]).to(self.device)  # (height, width)
            results = self.detr_processor.post_process_object_detection(
                outputs, target_sizes=target_sizes, threshold=0.5
            )[0]
            
            # Convert to readable format
            detected_objects = []
            for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
                detected_objects.append({
                    "label": self.detr_model.config.id2label[label.item()],
                    "confidence": score.item(),
                    "box": box.tolist()  # [x_min, y_min, x_max, y_max]
                })
            
            return detected_objects
            
        except Exception as e:
            self.logger.warning(f"Object detection failed: {e}")
            return []
    
    async def _smart_background_removal(self, image: Image.Image, content_type: str = "auto") -> Image.Image:
        """Smart background removal that chooses the best method based on content"""
        
        # Detect objects if auto mode
        if content_type == "auto":
            detected_objects = await self._detect_objects(image)
            
            # Determine content type based on detected objects
            human_objects = ["person", "man", "woman", "child", "baby"]
            clothing_objects = ["shirt", "dress", "jacket", "pants", "shoes"]
            
            has_humans = any(obj["label"] in human_objects for obj in detected_objects)
            has_clothing = any(obj["label"] in clothing_objects for obj in detected_objects)
            
            if has_humans:
                content_type = "human"
            elif has_clothing:
                content_type = "clothing"
            else:
                content_type = "general"
        
        # Choose appropriate model based on content type
        model_mapping = {
            "human": "u2net_human_seg",
            "clothing": "u2net_cloth_seg", 
            "portrait": "silueta",
            "general": "u2net",
            "auto": "u2net"
        }
        
        model_type = model_mapping.get(content_type, "u2net")
        
        # Try advanced method first, fallback to basic
        try:
            if self.use_removebg and content_type in ["human", "portrait"]:
                return await self._remove_bg_api(image, edge_refinement=True)
            else:
                return await self._remove_bg_local(image, model_type)
        except Exception as e:
            self.logger.warning(f"Advanced background removal failed: {e}, using fallback")
            return await self._remove_bg_local(image)
    
    async def generate_background(self, request: BackgroundGenerationRequest) -> BackgroundGenerationResponse:
        """Generate new background for subject image"""
        job_id = self.generate_job_id()
        start_time = time.time()
        
        try:
            # Create job tracking
            job_tracker.create_job(
                job_id=job_id,
                operation="background_generation",
                subject_url=request.subject_image_url,
                style_prompt=request.style_prompt
            )
            
            await self._log_job_start(
                job_id, "background_generation",
                subject_url=request.subject_image_url,
                style_prompt=request.style_prompt
            )
            
            job_tracker.set_job_processing(job_id, 10.0)
            
            # Download subject image
            subject_image = await self._download_image(request.subject_image_url)
            job_tracker.set_job_processing(job_id, 25.0)
            
            # Ensure subject has transparent background
            if not self._has_transparency(subject_image):
                self.logger.warning("Subject image doesn't have transparent background, applying removal")
                subject_image = await self._remove_bg_local(subject_image)
            
            job_tracker.set_job_processing(job_id, 40.0)
            
            # Generate background using image generation service
            background_image = await self._generate_background_image(
                request.style_prompt, 
                request.style,
                subject_image.size
            )
            
            job_tracker.set_job_processing(job_id, 70.0)
            
            # Composite subject onto background
            result_image = await self._composite_images(
                background_image, 
                subject_image,
                request.preserve_lighting
            )
            
            job_tracker.set_job_processing(job_id, 90.0)
            
            # Save result
            result_url = await self._save_image(result_image, f"bg_generated_{job_id}")
            
            # Create response
            response_data = BackgroundGenerationResponse(
                result_url=result_url,
                subject_url=request.subject_image_url,
                background_prompt=request.style_prompt,
                job_id=job_id
            )
            
            job_tracker.set_job_completed(job_id, result_url)
            
            duration = time.time() - start_time
            await self._log_job_complete(job_id, "background_generation", duration)
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            await self._log_job_error(job_id, "background_generation", e)
            raise
    
    async def remove_object(self, request: ObjectRemovalRequest) -> ObjectRemovalResponse:
        """Remove object from image using inpainting"""
        job_id = self.generate_job_id()
        start_time = time.time()
        
        try:
            # Create job tracking
            job_tracker.create_job(
                job_id=job_id,
                operation="object_removal",
                image_url=request.image_url,
                mask_area=len(request.mask_coordinates)
            )
            
            await self._log_job_start(
                job_id, "object_removal",
                image_url=request.image_url
            )
            
            job_tracker.set_job_processing(job_id, 10.0)
            
            # Download source image
            source_image = await self._download_image(request.image_url)
            job_tracker.set_job_processing(job_id, 25.0)
            
            # Create mask from coordinates
            mask_image = await self._create_mask_from_coordinates(
                source_image.size, 
                request.mask_coordinates
            )
            
            job_tracker.set_job_processing(job_id, 40.0)
            
            # Perform inpainting
            result_image = await self._inpaint_image(
                source_image, 
                mask_image, 
                request.inpaint_prompt
            )
            
            job_tracker.set_job_processing(job_id, 80.0)
            
            # Calculate mask area percentage
            mask_area = self._calculate_mask_area(mask_image)
            
            # Save result
            result_url = await self._save_image(result_image, f"obj_removed_{job_id}")
            
            # Create response
            response_data = ObjectRemovalResponse(
                result_url=result_url,
                original_url=request.image_url,
                mask_area=mask_area,
                job_id=job_id
            )
            
            job_tracker.set_job_completed(job_id, result_url)
            
            duration = time.time() - start_time
            await self._log_job_complete(job_id, "object_removal", duration)
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            await self._log_job_error(job_id, "object_removal", e)
            raise
    
    async def advanced_object_segmentation(
        self,
        image_url: str,
        prompt_points: List[Tuple[int, int]],
        prompt_labels: List[int]
    ) -> Dict[str, Any]:
        """Advanced object segmentation using SAM with interactive prompts"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="advanced_segmentation",
                image_url=image_url,
                prompt_points=len(prompt_points)
            )
            
            # Download image
            source_image = await self._download_image(image_url)
            
            # Perform SAM segmentation
            if self.sam_predictor:
                result_image = await self._remove_bg_sam(source_image, prompt_points, prompt_labels)
            else:
                # Fallback to smart background removal
                result_image = await self._smart_background_removal(source_image)
            
            # Save result
            result_url = await self._save_image(result_image, f"sam_segmented_{job_id}")
            
            job_tracker.set_job_completed(job_id, result_url)
            
            return {
                "result_url": result_url,
                "original_url": image_url,
                "job_id": job_id,
                "method": "sam" if self.sam_predictor else "fallback"
            }
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def batch_background_removal(
        self,
        image_urls: List[str],
        content_type: str = "auto",
        edge_refinement: bool = False
    ) -> Dict[str, Any]:
        """Process multiple images for background removal in batch"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="batch_background_removal",
                batch_size=len(image_urls),
                content_type=content_type
            )
            
            results = []
            for i, image_url in enumerate(image_urls):
                try:
                    # Update progress
                    progress = (i / len(image_urls)) * 90.0
                    job_tracker.set_job_processing(job_id, progress)
                    
                    # Download and process image
                    source_image = await self._download_image(image_url)
                    result_image = await self._smart_background_removal(source_image, content_type)
                    
                    # Save result
                    result_url = await self._save_image(result_image, f"batch_{job_id}_{i}")
                    
                    results.append({
                        "original_url": image_url,
                        "result_url": result_url,
                        "success": True
                    })
                    
                except Exception as e:
                    self.logger.error(f"Failed to process image {i}: {e}")
                    results.append({
                        "original_url": image_url,
                        "result_url": None,
                        "success": False,
                        "error": str(e)
                    })
            
            # Calculate success rate
            successful = sum(1 for r in results if r["success"])
            success_rate = (successful / len(results)) * 100 if results else 0
            
            response_data = {
                "results": results,
                "total_processed": len(results),
                "successful": successful,
                "failed": len(results) - successful,
                "success_rate": success_rate,
                "job_id": job_id
            }
            
            job_tracker.set_job_completed(job_id, f"Batch processed: {successful}/{len(results)}")
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def smart_object_detection(self, image_url: str) -> Dict[str, Any]:
        """Detect and classify objects in image for intelligent processing"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="object_detection",
                image_url=image_url
            )
            
            # Download image
            source_image = await self._download_image(image_url)
            
            # Detect objects
            detected_objects = await self._detect_objects(source_image)
            
            # Analyze composition
            analysis = {
                "total_objects": len(detected_objects),
                "object_types": list(set(obj["label"] for obj in detected_objects)),
                "high_confidence_objects": [
                    obj for obj in detected_objects if obj["confidence"] > 0.8
                ],
                "recommended_processing": self._recommend_processing_method(detected_objects),
                "scene_complexity": self._analyze_scene_complexity(detected_objects)
            }
            
            response_data = {
                "detected_objects": detected_objects,
                "analysis": analysis,
                "job_id": job_id
            }
            
            job_tracker.set_job_completed(job_id, f"Detected {len(detected_objects)} objects")
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def generate_smart_background(
        self,
        subject_image_url: str,
        style_prompt: str,
        preserve_lighting: bool = True,
        match_perspective: bool = True
    ) -> Dict[str, Any]:
        """Generate contextually appropriate background using AI"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="smart_background_generation",
                subject_url=subject_image_url,
                style_prompt=style_prompt
            )
            
            # Download and analyze subject
            subject_image = await self._download_image(subject_image_url)
            
            # Ensure transparent background
            if not self._has_transparency(subject_image):
                subject_image = await self._smart_background_removal(subject_image)
            
            # Analyze subject for context
            subject_analysis = await self._analyze_subject_context(subject_image)
            
            # Generate context-aware background
            enhanced_prompt = self._enhance_background_prompt(
                style_prompt, 
                subject_analysis,
                preserve_lighting,
                match_perspective
            )
            
            # Generate background
            background_image = await self._generate_contextual_background(
                enhanced_prompt,
                subject_image.size,
                subject_analysis
            )
            
            # Composite with advanced blending
            result_image = await self._advanced_composite(
                background_image,
                subject_image,
                preserve_lighting,
                match_perspective,
                subject_analysis
            )
            
            # Save result
            result_url = await self._save_image(result_image, f"smart_bg_{job_id}")
            
            response_data = {
                "result_url": result_url,
                "subject_url": subject_image_url,
                "background_prompt": enhanced_prompt,
                "subject_analysis": subject_analysis,
                "job_id": job_id
            }
            
            job_tracker.set_job_completed(job_id, result_url)
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    # Advanced helper methods for Phase 3
    
    def _recommend_processing_method(self, detected_objects: List[Dict]) -> str:
        """Recommend best processing method based on detected objects"""
        if not detected_objects:
            return "general"
        
        # Count object types
        labels = [obj["label"] for obj in detected_objects]
        
        human_count = sum(1 for label in labels if label in ["person", "man", "woman", "child"])
        product_count = sum(1 for label in labels if label in ["bottle", "cup", "book", "phone", "laptop"])
        
        if human_count > 0:
            return "human_portrait"
        elif product_count > 0:
            return "product_photography"
        else:
            return "general_object"
    
    def _analyze_scene_complexity(self, detected_objects: List[Dict]) -> str:
        """Analyze scene complexity for processing optimization"""
        if len(detected_objects) == 0:
            return "empty"
        elif len(detected_objects) == 1:
            return "simple"
        elif len(detected_objects) <= 3:
            return "moderate"
        else:
            return "complex"
    
    async def _analyze_subject_context(self, subject_image: Image.Image) -> Dict[str, Any]:
        """Analyze subject for contextual background generation"""
        # Detect objects in subject
        detected_objects = await self._detect_objects(subject_image)
        
        # Analyze lighting (simplified)
        image_array = np.array(subject_image.convert('RGB'))
        brightness = np.mean(image_array)
        
        # Analyze colors
        dominant_colors = self._extract_dominant_colors(image_array)
        
        return {
            "objects": detected_objects,
            "brightness": float(brightness),
            "lighting": "bright" if brightness > 128 else "dark",
            "dominant_colors": dominant_colors,
            "recommended_style": self._recommend_background_style(detected_objects)
        }
    
    def _extract_dominant_colors(self, image_array: np.ndarray, k: int = 3) -> List[List[int]]:
        """Extract dominant colors from image"""
        # Reshape image for k-means
        data = image_array.reshape((-1, 3))
        
        # Simple color extraction (would use k-means in production)
        # For now, return average colors from different regions
        h, w = image_array.shape[:2]
        colors = []
        
        # Sample from different regions
        regions = [
            image_array[:h//2, :w//2],  # Top-left
            image_array[:h//2, w//2:],  # Top-right
            image_array[h//2:, :w//2],  # Bottom-left
        ]
        
        for region in regions:
            avg_color = np.mean(region.reshape(-1, 3), axis=0)
            colors.append(avg_color.astype(int).tolist())
        
        return colors
    
    def _recommend_background_style(self, detected_objects: List[Dict]) -> str:
        """Recommend background style based on detected objects"""
        labels = [obj["label"] for obj in detected_objects]
        
        if any(label in ["person", "man", "woman"] for label in labels):
            return "portrait_studio"
        elif any(label in ["bottle", "cup", "phone", "laptop"] for label in labels):
            return "product_showcase"
        else:
            return "neutral_gradient"
    
    def _enhance_background_prompt(
        self,
        base_prompt: str,
        subject_analysis: Dict,
        preserve_lighting: bool,
        match_perspective: bool
    ) -> str:
        """Enhance background prompt with contextual information"""
        enhanced = base_prompt
        
        # Add lighting context
        if preserve_lighting:
            lighting = subject_analysis.get("lighting", "neutral")
            enhanced += f", {lighting} lighting"
        
        # Add color harmony
        dominant_colors = subject_analysis.get("dominant_colors", [])
        if dominant_colors:
            color_desc = "warm colors" if np.mean(dominant_colors[0][:2]) > np.mean(dominant_colors[0][2:]) else "cool colors"
            enhanced += f", {color_desc}"
        
        # Add style recommendation
        style = subject_analysis.get("recommended_style", "")
        if style:
            enhanced += f", {style} background"
        
        return enhanced
    
    async def _generate_contextual_background(
        self,
        prompt: str,
        size: Tuple[int, int],
        context: Dict
    ) -> Image.Image:
        """Generate background image using context-aware AI"""
        # This would integrate with the image generation service
        # For now, create a sophisticated gradient based on context
        
        background = Image.new("RGB", size, color=(240, 240, 240))
        
        # Apply context-based modifications
        lighting = context.get("lighting", "neutral")
        colors = context.get("dominant_colors", [[128, 128, 128]])
        
        if lighting == "bright":
            # Create lighter background
            background = Image.new("RGB", size, color=(250, 250, 250))
        elif lighting == "dark":
            # Create darker background
            background = Image.new("RGB", size, color=(60, 60, 60))
        
        return background
    
    async def _advanced_composite(
        self,
        background: Image.Image,
        subject: Image.Image,
        preserve_lighting: bool,
        match_perspective: bool,
        context: Dict
    ) -> Image.Image:
        """Advanced compositing with lighting and perspective matching"""
        # Ensure same size
        if background.size != subject.size:
            background = background.resize(subject.size, Image.Resampling.LANCZOS)
        
        # Convert to RGBA
        if background.mode != "RGBA":
            background = background.convert("RGBA")
        
        # Basic compositing
        result = Image.alpha_composite(background, subject)
        
        # Apply lighting preservation
        if preserve_lighting:
            result = self._adjust_lighting_advanced(result, subject, context)
        
        return result
    
    def _adjust_lighting_advanced(self, result: Image.Image, subject: Image.Image, context: Dict) -> Image.Image:
        """Advanced lighting adjustment based on subject analysis"""
        # Get brightness info
        brightness = context.get("brightness", 128)
        
        # Adjust result brightness to match subject
        enhancer = ImageEnhance.Brightness(result)
        adjustment_factor = brightness / 128.0  # Normalize
        result = enhancer.enhance(adjustment_factor)
        
        return result
    
    # Helper methods
    
    async def _download_image(self, image_url: str) -> Image.Image:
        """Download image from URL"""
        async with httpx.AsyncClient() as client:
            response = await client.get(image_url)
            response.raise_for_status()
            
            image = Image.open(io.BytesIO(response.content))
            return image.convert("RGBA")
    
    async def _save_image(self, image: Image.Image, filename: str) -> str:
        """Save image and return URL (implement based on storage strategy)"""
        # For now, return a mock URL - implement actual storage logic
        return f"https://storage.example.com/{filename}.png"
    
    def _has_transparency(self, image: Image.Image) -> bool:
        """Check if image has transparency"""
        return image.mode in ("RGBA", "LA") or "transparency" in image.info
    
    async def _generate_background_image(self, prompt: str, style, size: tuple) -> Image.Image:
        """Generate background image using the image generation service"""
        # This would integrate with the image generation service
        # For now, create a simple colored background
        background = Image.new("RGB", size, color=(240, 240, 240))
        return background
    
    async def _composite_images(self, background: Image.Image, subject: Image.Image, preserve_lighting: bool) -> Image.Image:
        """Composite subject onto background"""
        # Ensure both images are the same size
        if background.size != subject.size:
            background = background.resize(subject.size, Image.Resampling.LANCZOS)
        
        # Convert background to RGBA
        if background.mode != "RGBA":
            background = background.convert("RGBA")
        
        # Simple alpha compositing
        result = Image.alpha_composite(background, subject)
        
        if preserve_lighting:
            # Apply lighting preservation (simplified)
            result = self._adjust_lighting(result, subject)
        
        return result
    
    def _adjust_lighting(self, result: Image.Image, subject: Image.Image) -> Image.Image:
        """Adjust lighting to match subject (simplified implementation)"""
        # This is a placeholder - implement proper lighting adjustment
        return result
    
    async def _create_mask_from_coordinates(self, image_size: tuple, coordinates: list) -> Image.Image:
        """Create mask image from polygon coordinates"""
        from PIL import ImageDraw
        
        mask = Image.new("L", image_size, 0)  # Black background
        draw = ImageDraw.Draw(mask)
        
        # Draw filled polygon in white
        if len(coordinates) >= 3:
            flat_coords = [coord for point in coordinates for coord in point]
            draw.polygon(flat_coords, fill=255)
        
        return mask
    
    async def _inpaint_image(self, image: Image.Image, mask: Image.Image, prompt: Optional[str]) -> Image.Image:
        """Perform inpainting to remove object"""
        # This is a simplified implementation
        # In a real scenario, you'd use a proper inpainting model
        
        # For now, just fill the masked area with surrounding colors
        result = image.copy()
        
        # Convert mask to binary
        mask_array = np.array(mask)
        image_array = np.array(result)
        
        # Simple content-aware fill (very basic)
        # In production, use proper inpainting algorithms
        for y in range(mask_array.shape[0]):
            for x in range(mask_array.shape[1]):
                if mask_array[y, x] > 128:  # Masked pixel
                    # Find nearest non-masked pixel and copy its color
                    for radius in range(1, 50):
                        found = False
                        for dy in range(-radius, radius + 1):
                            for dx in range(-radius, radius + 1):
                                ny, nx = y + dy, x + dx
                                if (0 <= ny < mask_array.shape[0] and 
                                    0 <= nx < mask_array.shape[1] and
                                    mask_array[ny, nx] <= 128):
                                    image_array[y, x] = image_array[ny, nx]
                                    found = True
                                    break
                            if found:
                                break
                        if found:
                            break
        
        return Image.fromarray(image_array)
    
    def _calculate_mask_area(self, mask: Image.Image) -> float:
        """Calculate percentage of image area covered by mask"""
        mask_array = np.array(mask)
        total_pixels = mask_array.size
        masked_pixels = np.sum(mask_array > 128)
        return (masked_pixels / total_pixels) * 100.0
    
    async def close(self):
        """Close the service and cleanup resources"""
        if self.removebg_client:
            await self.removebg_client.aclose()


# Global service instance
background_removal_service = BackgroundRemovalService()