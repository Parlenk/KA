const express = require('express');
const router = express.Router();

// Mock data storage
let mockAnimations = [];

// Animation presets
const animationPresets = [
  // Entry animations
  { id: 'fade-in', name: 'Fade In', type: 'entry', duration: 500, easing: 'ease-out' },
  { id: 'slide-left', name: 'Slide from Left', type: 'entry', duration: 600, easing: 'ease-out' },
  { id: 'slide-right', name: 'Slide from Right', type: 'entry', duration: 600, easing: 'ease-out' },
  { id: 'slide-up', name: 'Slide from Bottom', type: 'entry', duration: 600, easing: 'ease-out' },
  { id: 'slide-down', name: 'Slide from Top', type: 'entry', duration: 600, easing: 'ease-out' },
  { id: 'zoom-in', name: 'Zoom In', type: 'entry', duration: 400, easing: 'ease-out' },
  { id: 'rotate-in', name: 'Rotate In', type: 'entry', duration: 500, easing: 'ease-out' },
  
  // Exit animations
  { id: 'fade-out', name: 'Fade Out', type: 'exit', duration: 500, easing: 'ease-in' },
  { id: 'slide-out-left', name: 'Slide Out Left', type: 'exit', duration: 600, easing: 'ease-in' },
  { id: 'slide-out-right', name: 'Slide Out Right', type: 'exit', duration: 600, easing: 'ease-in' },
  { id: 'zoom-out', name: 'Zoom Out', type: 'exit', duration: 400, easing: 'ease-in' },
  
  // Emphasis animations
  { id: 'bounce', name: 'Bounce', type: 'emphasis', duration: 1000, easing: 'ease-in-out' },
  { id: 'pulse', name: 'Pulse', type: 'emphasis', duration: 800, easing: 'ease-in-out' },
  { id: 'shake', name: 'Shake', type: 'emphasis', duration: 500, easing: 'linear' },
  { id: 'swing', name: 'Swing', type: 'emphasis', duration: 1000, easing: 'ease-in-out' },
  { id: 'tada', name: 'Tada', type: 'emphasis', duration: 1000, easing: 'ease-in-out' }
];

// Get all animations for a design
router.get('/', (req, res) => {
  const { designId } = req.query;
  
  let animations = [...mockAnimations];
  if (designId) {
    animations = animations.filter(a => a.designId === parseInt(designId));
  }
  
  res.json({
    animations,
    presets: animationPresets,
    total: animations.length
  });
});

// Get animation presets
router.get('/presets', (req, res) => {
  const { type } = req.query;
  
  let presets = [...animationPresets];
  if (type) {
    presets = presets.filter(p => p.type === type);
  }
  
  res.json({ presets });
});

// Create new animation timeline
router.post('/', (req, res) => {
  const { designId, timeline, duration = 5000, fps = 60 } = req.body;
  
  if (!designId || !timeline) {
    return res.status(400).json({ error: 'Design ID and timeline are required' });
  }
  
  const newAnimation = {
    id: mockAnimations.length + 1,
    designId: parseInt(designId),
    timeline,
    duration,
    fps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockAnimations.push(newAnimation);
  res.status(201).json(newAnimation);
});

// Get animation by ID
router.get('/:id', (req, res) => {
  const animation = mockAnimations.find(a => a.id === parseInt(req.params.id));
  if (!animation) {
    return res.status(404).json({ error: 'Animation not found' });
  }
  res.json(animation);
});

// Update animation timeline
router.put('/:id', (req, res) => {
  const animationId = parseInt(req.params.id);
  const { timeline, duration, fps } = req.body;
  
  const animIndex = mockAnimations.findIndex(a => a.id === animationId);
  if (animIndex === -1) {
    return res.status(404).json({ error: 'Animation not found' });
  }
  
  mockAnimations[animIndex] = {
    ...mockAnimations[animIndex],
    timeline: timeline || mockAnimations[animIndex].timeline,
    duration: duration || mockAnimations[animIndex].duration,
    fps: fps || mockAnimations[animIndex].fps,
    updatedAt: new Date().toISOString()
  };
  
  res.json(mockAnimations[animIndex]);
});

// Delete animation
router.delete('/:id', (req, res) => {
  const animationId = parseInt(req.params.id);
  
  const animIndex = mockAnimations.findIndex(a => a.id === animationId);
  if (animIndex === -1) {
    return res.status(404).json({ error: 'Animation not found' });
  }
  
  mockAnimations.splice(animIndex, 1);
  res.json({ success: true, message: 'Animation deleted' });
});

// Apply preset animation
router.post('/apply-preset', (req, res) => {
  const { designId, objectId, presetId, startTime = 0 } = req.body;
  
  const preset = animationPresets.find(p => p.id === presetId);
  if (!preset) {
    return res.status(404).json({ error: 'Preset not found' });
  }
  
  // Generate keyframes based on preset
  const keyframes = generateKeyframesFromPreset(preset, startTime);
  
  res.json({
    success: true,
    objectId,
    preset,
    keyframes,
    message: `Applied ${preset.name} animation`
  });
});

// Magic Animator - AI-powered animation generation
router.post('/magic', (req, res) => {
  const { designId, objectIds, style = 'smooth' } = req.body;
  
  if (!designId || !objectIds || !Array.isArray(objectIds)) {
    return res.status(400).json({ error: 'Design ID and object IDs array are required' });
  }
  
  // Simulate AI-generated animation
  setTimeout(() => {
    const magicTimeline = {
      duration: 3000,
      layers: {}
    };
    
    // Generate animations for each object
    objectIds.forEach((id, index) => {
      const delay = index * 200;
      const preset = getRandomPreset('entry');
      
      magicTimeline.layers[id] = {
        keyframes: generateMagicKeyframes(style, delay),
        easing: preset.easing
      };
    });
    
    res.json({
      success: true,
      timeline: magicTimeline,
      style,
      message: 'Magic animation generated successfully'
    });
  }, 1000);
});

// Preview animation
router.post('/preview', (req, res) => {
  const { timeline, currentTime = 0 } = req.body;
  
  if (!timeline) {
    return res.status(400).json({ error: 'Timeline is required' });
  }
  
  // Calculate object states at current time
  const objectStates = {};
  
  Object.entries(timeline.layers).forEach(([objectId, layer]) => {
    const state = interpolateKeyframes(layer.keyframes, currentTime);
    objectStates[objectId] = state;
  });
  
  res.json({
    currentTime,
    objectStates,
    isPlaying: currentTime < timeline.duration
  });
});

// Helper functions
function generateKeyframesFromPreset(preset, startTime) {
  const keyframes = [];
  
  switch (preset.id) {
    case 'fade-in':
      keyframes.push(
        { time: startTime, properties: { opacity: 0 } },
        { time: startTime + preset.duration, properties: { opacity: 1 } }
      );
      break;
    case 'slide-left':
      keyframes.push(
        { time: startTime, properties: { x: -100, opacity: 0 } },
        { time: startTime + preset.duration, properties: { x: 0, opacity: 1 } }
      );
      break;
    case 'zoom-in':
      keyframes.push(
        { time: startTime, properties: { scale: 0, opacity: 0 } },
        { time: startTime + preset.duration, properties: { scale: 1, opacity: 1 } }
      );
      break;
    case 'bounce':
      keyframes.push(
        { time: startTime, properties: { y: 0 } },
        { time: startTime + preset.duration * 0.4, properties: { y: -30 } },
        { time: startTime + preset.duration * 0.6, properties: { y: 0 } },
        { time: startTime + preset.duration * 0.8, properties: { y: -15 } },
        { time: startTime + preset.duration, properties: { y: 0 } }
      );
      break;
    // Add more preset implementations
  }
  
  return keyframes;
}

function generateMagicKeyframes(style, delay) {
  const keyframes = [];
  
  switch (style) {
    case 'smooth':
      keyframes.push(
        { time: delay, properties: { opacity: 0, y: 20 } },
        { time: delay + 500, properties: { opacity: 1, y: 0 } }
      );
      break;
    case 'dynamic':
      keyframes.push(
        { time: delay, properties: { opacity: 0, scale: 0.8, rotation: -10 } },
        { time: delay + 300, properties: { opacity: 1, scale: 1.1, rotation: 5 } },
        { time: delay + 500, properties: { scale: 1, rotation: 0 } }
      );
      break;
    case 'playful':
      keyframes.push(
        { time: delay, properties: { opacity: 0, x: -50, rotation: -180 } },
        { time: delay + 600, properties: { opacity: 1, x: 0, rotation: 0 } }
      );
      break;
  }
  
  return keyframes;
}

function getRandomPreset(type) {
  const presets = animationPresets.filter(p => p.type === type);
  return presets[Math.floor(Math.random() * presets.length)];
}

function interpolateKeyframes(keyframes, currentTime) {
  if (!keyframes || keyframes.length === 0) return {};
  
  // Find surrounding keyframes
  let prevKeyframe = keyframes[0];
  let nextKeyframe = null;
  
  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].time <= currentTime) {
      prevKeyframe = keyframes[i];
    } else {
      nextKeyframe = keyframes[i];
      break;
    }
  }
  
  if (!nextKeyframe) {
    return prevKeyframe.properties;
  }
  
  // Interpolate between keyframes
  const progress = (currentTime - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
  const interpolated = {};
  
  Object.keys(prevKeyframe.properties).forEach(prop => {
    const start = prevKeyframe.properties[prop];
    const end = nextKeyframe.properties[prop];
    interpolated[prop] = start + (end - start) * progress;
  });
  
  return interpolated;
}

module.exports = router;