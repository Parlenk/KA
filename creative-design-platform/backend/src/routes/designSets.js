const express = require('express');
const router = express.Router();

// Mock data storage
let mockDesignSets = [];
let mockDesigns = [];

// Get all design sets
router.get('/', (req, res) => {
  const { userId } = req.query;
  
  let filteredSets = [...mockDesignSets];
  if (userId) {
    filteredSets = filteredSets.filter(ds => ds.userId === parseInt(userId));
  }
  
  res.json({
    designSets: filteredSets,
    total: filteredSets.length
  });
});

// Create new design set
router.post('/', (req, res) => {
  const { name, baseDesignId, sizes, userId = 1 } = req.body;
  
  if (!name || !sizes || !Array.isArray(sizes)) {
    return res.status(400).json({ error: 'Name and sizes array are required' });
  }
  
  const newDesignSet = {
    id: mockDesignSets.length + 1,
    name,
    baseDesignId,
    sizes,
    userId,
    designs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Create designs for each size
  sizes.forEach(size => {
    const [width, height] = size.split('x').map(Number);
    const design = {
      id: mockDesigns.length + 1,
      designSetId: newDesignSet.id,
      size,
      width,
      height,
      canvas: {
        width,
        height,
        background: '#ffffff',
        objects: []
      },
      animations: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockDesigns.push(design);
    newDesignSet.designs.push(design.id);
  });
  
  mockDesignSets.push(newDesignSet);
  res.status(201).json(newDesignSet);
});

// Get design set by ID
router.get('/:id', (req, res) => {
  const designSet = mockDesignSets.find(ds => ds.id === parseInt(req.params.id));
  if (!designSet) {
    return res.status(404).json({ error: 'Design set not found' });
  }
  
  const designs = mockDesigns.filter(d => designSet.designs.includes(d.id));
  res.json({ ...designSet, designs });
});

// Update design set
router.put('/:id', (req, res) => {
  const setId = parseInt(req.params.id);
  const { name } = req.body;
  
  const setIndex = mockDesignSets.findIndex(ds => ds.id === setId);
  if (setIndex === -1) {
    return res.status(404).json({ error: 'Design set not found' });
  }
  
  mockDesignSets[setIndex] = {
    ...mockDesignSets[setIndex],
    name: name || mockDesignSets[setIndex].name,
    updatedAt: new Date().toISOString()
  };
  
  res.json(mockDesignSets[setIndex]);
});

// Delete design set
router.delete('/:id', (req, res) => {
  const setId = parseInt(req.params.id);
  
  const setIndex = mockDesignSets.findIndex(ds => ds.id === setId);
  if (setIndex === -1) {
    return res.status(404).json({ error: 'Design set not found' });
  }
  
  // Remove associated designs
  const designSet = mockDesignSets[setIndex];
  mockDesigns = mockDesigns.filter(d => !designSet.designs.includes(d.id));
  
  // Remove design set
  mockDesignSets.splice(setIndex, 1);
  
  res.json({ success: true, message: 'Design set deleted' });
});

// Sync changes across designs in a set
router.put('/:id/sync', (req, res) => {
  const { changes, sourceDesignId, syncType = 'all' } = req.body;
  const designSetId = parseInt(req.params.id);
  
  const designSet = mockDesignSets.find(ds => ds.id === designSetId);
  if (!designSet) {
    return res.status(404).json({ error: 'Design set not found' });
  }
  
  // Apply changes to designs based on sync type
  const updatedDesigns = mockDesigns
    .filter(d => designSet.designs.includes(d.id))
    .map(design => {
      if (design.id !== sourceDesignId) {
        // Apply smart resize logic
        const scaleFactor = design.width / changes.sourceWidth || 1;
        const scaledChanges = applySmartResize(changes, scaleFactor, design);
        
        return {
          ...design,
          canvas: {
            ...design.canvas,
            objects: syncType === 'all' ? scaledChanges.objects : design.canvas.objects,
            background: syncType === 'background' || syncType === 'all' ? changes.background : design.canvas.background
          },
          updatedAt: new Date().toISOString()
        };
      }
      return design;
    });
  
  // Update in storage
  updatedDesigns.forEach(updated => {
    const index = mockDesigns.findIndex(d => d.id === updated.id);
    if (index !== -1) {
      mockDesigns[index] = updated;
    }
  });
  
  res.json({ success: true, updatedDesigns: updatedDesigns.length });
});

// Add new size variation
router.post('/:id/sizes', (req, res) => {
  const { size } = req.body;
  const designSetId = parseInt(req.params.id);
  
  const designSet = mockDesignSets.find(ds => ds.id === designSetId);
  if (!designSet) {
    return res.status(404).json({ error: 'Design set not found' });
  }
  
  if (designSet.sizes.includes(size)) {
    return res.status(400).json({ error: 'Size already exists in this design set' });
  }
  
  // Create new design for the size
  const [width, height] = size.split('x').map(Number);
  const newDesign = {
    id: mockDesigns.length + 1,
    designSetId,
    size,
    width,
    height,
    canvas: {
      width,
      height,
      background: '#ffffff',
      objects: []
    },
    animations: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Copy objects from base design if exists
  if (designSet.designs.length > 0) {
    const baseDesign = mockDesigns.find(d => d.id === designSet.designs[0]);
    if (baseDesign) {
      const scaleFactor = width / baseDesign.width;
      newDesign.canvas.objects = scaleObjects(baseDesign.canvas.objects, scaleFactor);
      newDesign.canvas.background = baseDesign.canvas.background;
    }
  }
  
  mockDesigns.push(newDesign);
  designSet.designs.push(newDesign.id);
  designSet.sizes.push(size);
  designSet.updatedAt = new Date().toISOString();
  
  res.status(201).json(newDesign);
});

// Helper functions
function applySmartResize(changes, scaleFactor, targetDesign) {
  return {
    ...changes,
    objects: changes.objects?.map(obj => ({
      ...obj,
      left: obj.left * scaleFactor,
      top: obj.top * scaleFactor,
      width: obj.width * scaleFactor,
      height: obj.height * scaleFactor,
      fontSize: obj.fontSize ? obj.fontSize * scaleFactor : undefined
    }))
  };
}

function scaleObjects(objects, scaleFactor) {
  return objects.map(obj => ({
    ...obj,
    left: obj.left * scaleFactor,
    top: obj.top * scaleFactor,
    width: obj.width * scaleFactor,
    height: obj.height * scaleFactor,
    fontSize: obj.fontSize ? obj.fontSize * scaleFactor : undefined
  }));
}

module.exports = router;