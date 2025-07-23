import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fabric } from 'fabric';
import SimpleCanvas from '../components/editor/SimpleCanvas';
import EnterprisePropertiesPanel from '../components/editor/EnterprisePropertiesPanel';
import LayersPanel from '../components/editor/LayersPanel';
import ShortcutsHelp from '../components/editor/ShortcutsHelp';
import KredivoLogo from '../components/ui/KredivoLogo';
import { getApiUrl } from '../utils/api';

interface Template {
  id: number;
  name: string;
  category: string;
  description: string;
  dimensions: { width: number; height: number };
}

interface Project {
  id: number;
  name: string;
  templateId: number;
}

export default function SimpleEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<any>(null);
  
  // Get canvas size from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlWidth = urlParams.get('width');
  const urlHeight = urlParams.get('height');
  const initialCanvasWidth = urlWidth ? parseInt(urlWidth) : 800;
  const initialCanvasHeight = urlHeight ? parseInt(urlHeight) : 600;
  
  const [project, setProject] = useState<Project | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [selectedTool, setSelectedTool] = useState('select');
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Check undo/redo state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (canvasRef.current) {
        setCanUndo(canvasRef.current.canUndo());
        setCanRedo(canvasRef.current.canRedo());
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcuts for help and layer selection
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Help shortcuts
      if (e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        setShowShortcutsHelp(prev => !prev);
      }
      
      // Layer selection shortcuts
      if (canvas && (e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        // Select all objects
        const allObjects = canvas.getObjects().filter(obj => obj.selectable !== false);
        if (allObjects.length === 0) return;
        
        if (allObjects.length === 1) {
          canvas.setActiveObject(allObjects[0]);
        } else {
          const activeSelection = new fabric.ActiveSelection(allObjects, {
            canvas: canvas,
          });
          canvas.setActiveObject(activeSelection);
        }
        canvas.renderAll();
      }
      
      // Deselect all (Escape key)
      if (canvas && e.key === 'Escape') {
        e.preventDefault();
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [canvas]);
  const [showTextModal, setShowTextModal] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [zoom, setZoom] = useState(100);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showCanvasSettings, setShowCanvasSettings] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(initialCanvasWidth);
  const [canvasHeight, setCanvasHeight] = useState(initialCanvasHeight);
  const [useSmartResize, setUseSmartResize] = useState(true);
  const [widthInput, setWidthInput] = useState(initialCanvasWidth.toString());
  const [heightInput, setHeightInput] = useState(initialCanvasHeight.toString());
  const [canvasBackground, setCanvasBackground] = useState('#8BDFFF');
  const [showBorder, setShowBorder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasOverflowObjects, setHasOverflowObjects] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || !projectId || !canvas) return;

    const autoSaveInterval = setInterval(async () => {
      await autoSaveDesign();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges, projectId, canvas]);

  // Track canvas changes for auto-save
  useEffect(() => {
    if (!canvas) return;

    const handleCanvasChange = () => {
      setHasUnsavedChanges(true);
    };

    canvas.on('object:added', handleCanvasChange);
    canvas.on('object:removed', handleCanvasChange);
    canvas.on('object:modified', handleCanvasChange);
    canvas.on('path:created', handleCanvasChange);

    return () => {
      canvas.off('object:added', handleCanvasChange);
      canvas.off('object:removed', handleCanvasChange);
      canvas.off('object:modified', handleCanvasChange);
      canvas.off('path:created', handleCanvasChange);
    };
  }, [canvas]);

  // Update canvas dimensions when template loads
  useEffect(() => {
    if (template) {
      setCanvasWidth(template.dimensions.width);
      setCanvasHeight(template.dimensions.height);
      setWidthInput(template.dimensions.width.toString());
      setHeightInput(template.dimensions.height.toString());
    }
  }, [template]);

  const fetchProjectData = async () => {
    try {
      // In a real app, you'd fetch the project and template data
      // For now, using mock data based on projectId
      const mockProject = {
        id: parseInt(projectId || '1'),
        name: `Kredivo Ad Project ${projectId}`,
        templateId: 1
      };
      
      const templateResponse = await fetch(`${getApiUrl()}/templates/1`);
      const templateData = await templateResponse.json();
      
      setProject(mockProject);
      setTemplate(templateData);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    }
  };

  // Canvas event handlers
  const handleSelectionChange = (objects: fabric.Object[]) => {
    setSelectedObjects(objects);
  };

  const handleObjectModified = (object: fabric.Object) => {
    // Handle object modification
    console.log('Object modified:', object);
  };

  const handleHistoryChange = (canUndo: boolean, canRedo: boolean) => {
    setCanUndo(canUndo);
    setCanRedo(canRedo);
  };

  const handleObjectUpdate = (object: fabric.Object, properties: any) => {
    // Handle property updates from properties panel
    if (!canvas) return;

    // Handle special property updates
    if (properties.visible !== undefined) {
      object.set('visible', properties.visible);
    }
    
    if (properties.locked !== undefined) {
      object.set('selectable', !properties.locked);
      object.set('evented', !properties.locked);
    }

    if (properties.name !== undefined) {
      (object as any).name = properties.name;
    }

    // Apply all other properties directly
    Object.keys(properties).forEach(key => {
      if (key !== 'visible' && key !== 'locked' && key !== 'name') {
        object.set(key, properties[key]);
      }
    });

    canvas.renderAll();
    console.log('Object updated:', object, properties);
  };

  const handleCanvasReady = (fabricCanvas: fabric.Canvas) => {
    setCanvas(fabricCanvas);
    
    // Add event listener to check for overflow objects
    const checkOverflow = () => {
      setTimeout(() => {
        if (canvasRef.current?.hasOverflowObjects) {
          const hasOverflow = canvasRef.current.hasOverflowObjects();
          console.log('🔍 Checking overflow objects:', hasOverflow);
          setHasOverflowObjects(hasOverflow);
        }
      }, 50); // Small delay to ensure coordinates are updated
    };
    
    fabricCanvas.on('object:modified', checkOverflow);
    fabricCanvas.on('object:added', checkOverflow);
    fabricCanvas.on('object:removed', checkOverflow);
    fabricCanvas.on('object:moving', checkOverflow);
    fabricCanvas.on('object:scaling', checkOverflow);
    
    // Set initial canvas background
    fabricCanvas.backgroundColor = canvasBackground;
    fabricCanvas.renderAll();
    
    // Load saved design once canvas is ready
    if (projectId) {
      setTimeout(() => {
        loadSavedDesignWithCanvas(fabricCanvas);
      }, 500); // Small delay to ensure canvas is fully initialized
    }
  };

  const loadSavedDesignWithCanvas = async (fabricCanvas: fabric.Canvas) => {
    if (!projectId) return;

    try {
      const response = await fetch(`${getApiUrl()}/projects/${projectId}/canvas`);
      const data = await response.json();

      if (data.success && data.canvas && fabricCanvas) {
        // Clear default content first
        fabricCanvas.clear();
        
        // Load the saved canvas data
        fabricCanvas.loadFromJSON(data.canvas, () => {
          fabricCanvas.renderAll();
          console.log('✅ Design loaded successfully');
          
          if (data.lastSaved) {
            setLastSaved(new Date(data.lastSaved).toLocaleString());
          }
          
          setHasUnsavedChanges(false);
        });
      }
    } catch (error) {
      console.error('Error loading saved design:', error);
    }
  };

  // Update canvas background color
  const updateCanvasBackground = (color: string) => {
    if (canvas) {
      canvas.backgroundColor = color;
      canvas.renderAll();
    }
    setCanvasBackground(color);
  };

  // Layer handlers
  const handleLayerSelect = (object: fabric.Object, isMultiSelect?: boolean) => {
    // Don't override canvas selection if it's already handled by LayersPanel
    if (!isMultiSelect && canvas) {
      canvas.setActiveObject(object);
      canvas.renderAll();
    }
  };

  const handleLayerVisibilityChange = (object: fabric.Object, visible: boolean) => {
    console.log('Layer visibility changed:', object, visible);
  };

  const handleLayerLockChange = (object: fabric.Object, locked: boolean) => {
    console.log('Layer lock changed:', object, locked);
  };

  const handleLayerNameChange = (object: fabric.Object, name: string) => {
    console.log('Layer name changed:', object, name);
  };

  const handleLayerDelete = (object: fabric.Object) => {
    console.log('Layer deleted:', object);
  };

  // Tool functions
  const addText = () => {
    setShowTextModal(true);
  };

  const confirmAddText = () => {
    if (canvasRef.current && textContent.trim()) {
      canvasRef.current.addText(textContent.trim());
      setTextContent('');
      setShowTextModal(false);
    }
  };

  const addShape = (type: 'rectangle' | 'circle') => {
    if (canvasRef.current) {
      canvasRef.current.addShape(type);
    }
  };

  const addImage = () => {
    setShowImageModal(true);
  };

  const addImageFromUrl = (url: string) => {
    if (url && canvas) {
      fabric.Image.fromURL(url, (img) => {
        img.set({
          left: 200,
          top: 200,
          scaleX: 0.5,
          scaleY: 0.5,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      }, { crossOrigin: 'anonymous' });
    }
  };

  const addImageFromFile = (file: File) => {
    if (!canvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      fabric.Image.fromURL(dataUrl, (img) => {
        img.set({
          left: 200,
          top: 200,
          scaleX: 0.5,
          scaleY: 0.5,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
  };

  const handleImageSubmit = () => {
    if (imageUrl.trim()) {
      addImageFromUrl(imageUrl.trim());
    }
    setImageUrl('');
    setShowImageModal(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      addImageFromFile(file);
      setShowImageModal(false);
    }
  };

  const undo = () => {
    if (canvasRef.current && canvasRef.current.canUndo()) {
      canvasRef.current.undo();
    }
  };

  const redo = () => {
    if (canvasRef.current && canvasRef.current.canRedo()) {
      canvasRef.current.redo();
    }
  };

  const zoomIn = () => {
    const newZoom = Math.min(zoom + 25, 400);
    setZoom(newZoom);
    if (canvasRef.current && canvasRef.current.setZoom) {
      canvasRef.current.setZoom(newZoom / 100);
    }
  };

  const zoomOut = () => {
    const newZoom = Math.max(zoom - 25, 25);
    setZoom(newZoom);
    if (canvasRef.current && canvasRef.current.setZoom) {
      canvasRef.current.setZoom(newZoom / 100);
    }
  };

  const resetZoom = () => {
    setZoom(100);
    if (canvasRef.current && canvasRef.current.setZoom) {
      canvasRef.current.setZoom(1);
    }
  };

  const fitToScreen = () => {
    if (canvasRef.current && canvasRef.current.zoomToFit) {
      const newZoom = canvasRef.current.zoomToFit();
      if (newZoom) {
        setZoom(newZoom);
      }
    }
  };

  const saveProject = async () => {
    console.log('🔄 Save project called:', { 
      canvasRef: !!canvasRef.current, 
      projectId,
      canvas: !!canvas,
      isSaving 
    });

    if (!projectId) {
      console.error('❌ No project ID available');
      setShowError('No project ID available. Please refresh the page.');
      return;
    }

    if (!canvasRef.current) {
      console.error('❌ Canvas reference is null');
      setShowError('Canvas not ready. Please wait a moment and try again.');
      return;
    }

    if (isSaving) {
      console.log('⏳ Save already in progress, skipping...');
      return;
    }

    setIsSaving(true);
    setShowError('');
    
    try {
      console.log('📊 Getting canvas data...');
      
      // Check if canvas methods exist
      console.log('🔍 Checking canvas methods:', {
        hasGetCanvasData: typeof canvasRef.current.getCanvasData === 'function',
        hasExportCanvas: typeof canvasRef.current.exportCanvas === 'function',
        canvasRefKeys: Object.keys(canvasRef.current || {})
      });
      
      if (typeof canvasRef.current.getCanvasData !== 'function') {
        throw new Error('getCanvasData method not available on canvas');
      }
      
      if (typeof canvasRef.current.exportCanvas !== 'function') {
        throw new Error('exportCanvas method not available on canvas');
      }

      const canvasData = canvasRef.current.getCanvasData();
      const thumbnail = canvasRef.current.exportCanvas();
      
      console.log('📊 Canvas data retrieved:', { 
        hasCanvasData: !!canvasData, 
        hasThumbnail: !!thumbnail,
        canvasDataType: typeof canvasData,
        thumbnailLength: thumbnail?.length,
        canvasObjectCount: canvasData?.objects?.length || 0
      });

      if (!canvasData) {
        throw new Error('No canvas data available');
      }
      
      console.log('🌐 Sending save request to server...');
      
      const requestBody = {
        canvas: canvasData,
        thumbnail: thumbnail || ''
      };
      
      console.log('📦 Request body:', {
        hasCanvas: !!requestBody.canvas,
        hasThumbnail: !!requestBody.thumbnail,
        canvasKeys: Object.keys(requestBody.canvas || {}),
        objectCount: requestBody.canvas?.objects?.length || 0
      });
      
      const response = await fetch(`${getApiUrl()}/projects/${projectId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Server response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📄 Server response data:', data);

      if (data.success) {
        setLastSaved(new Date(data.savedAt).toLocaleString());
        setHasUnsavedChanges(false);
        setShowError('');
        // Show success message without alert
        console.log('✅ Project saved successfully at:', data.savedAt);
        
        // Show a temporary success indicator
        const successElement = document.createElement('div');
        successElement.textContent = '✅ Design saved successfully!';
        successElement.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 10000;
          font-weight: 500;
        `;
        document.body.appendChild(successElement);
        setTimeout(() => {
          document.body.removeChild(successElement);
        }, 3000);
      } else {
        throw new Error(data.error || 'Server returned success: false');
      }
    } catch (error) {
      console.error('❌ Error saving project:', error);
      setShowError(`Failed to save project: ${error.message}`);
    } finally {
      setIsSaving(false);
      console.log('🏁 Save process completed');
    }
  };

  const autoSaveDesign = async () => {
    if (!canvasRef.current || !projectId || isSaving) return;

    try {
      // Check if canvas methods exist
      if (typeof canvasRef.current.getCanvasData !== 'function') {
        console.warn('⚠️ Auto-save: getCanvasData method not available');
        return;
      }

      const canvasData = canvasRef.current.getCanvasData();
      
      if (!canvasData) {
        console.warn('⚠️ Auto-save: No canvas data available');
        return;
      }
      
      const response = await fetch(`${getApiUrl()}/projects/${projectId}/autosave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvas: canvasData
        })
      });

      if (!response.ok) {
        console.warn(`⚠️ Auto-save failed: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setHasUnsavedChanges(false);
        console.log('🔄 Auto-saved at:', new Date(data.autoSavedAt).toLocaleString());
      } else {
        console.warn('⚠️ Auto-save: Server returned success: false');
      }
    } catch (error) {
      console.warn('⚠️ Auto-save failed:', error);
    }
  };

  const exportProject = (format: 'png' | 'jpg' = 'png') => {
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.exportCanvas();
    if (!dataUrl) return;

    // Create download link
    const link = document.createElement('a');
    link.download = `${project?.name || 'kredivo-ad'}.png`;
    link.href = dataUrl;
    link.click();
  };

  const saveAsTemplate = async () => {
    if (!project) {
      alert('No project loaded');
      return;
    }

    const templateName = prompt(`Save "${project.name}" as template. Enter template name:`, `${project.name} Template`);
    if (!templateName) return;

    const description = prompt('Enter template description (optional):', `Professional template created from ${project.name}`);
    
    try {
      const response = await fetch(`${getApiUrl()}/projects/${project.id}/save-as-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName: templateName.trim(),
          description: description?.trim() || `Template created from ${project.name}`,
          category: 'custom'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Template "${templateName}" created successfully! You can find it in the Custom category on the dashboard.`);
      } else {
        alert('Failed to save as template');
      }
    } catch (error) {
      console.error('Error saving as template:', error);
      alert('Error saving as template');
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      flexDirection: 'column' as 'column'
    },
    header: {
      backgroundColor: 'white',
      borderBottom: '1px solid #e2e8f0',
      padding: '0.75rem 0',
      zIndex: 10
    },
    headerContent: {
      width: '100%',
      padding: '0 1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    logoText: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      color: '#1f2937',
      lineHeight: '1',
      marginTop: '-8px'
    },
    projectInfo: {
      display: 'flex',
      flexDirection: 'column' as 'column',
      alignItems: 'center'
    },
    projectName: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1f2937',
      margin: 0
    },
    projectMeta: {
      fontSize: '0.75rem',
      color: '#6b7280',
      margin: 0
    },
    headerActions: {
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'center'
    },
    button: {
      padding: '0.5rem 0.75rem',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem'
    },
    primaryButton: {
      backgroundColor: '#4f46e5',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    toolbar: {
      backgroundColor: 'white',
      borderBottom: '1px solid #e2e8f0',
      padding: '0.75rem 0'
    },
    toolbarContent: {
      width: '100%',
      padding: '0 1rem',
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    },
    toolGroup: {
      display: 'flex',
      gap: '0.25rem',
      alignItems: 'center',
      borderRight: '1px solid #e5e7eb',
      paddingRight: '1rem'
    },
    toolButton: {
      padding: '0.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '0.75rem',
      transition: 'all 0.2s',
      minWidth: '2.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    toolButtonActive: {
      backgroundColor: '#4f46e5',
      color: 'white',
      borderColor: '#4f46e5'
    },
    main: {
      flex: 1,
      display: 'flex',
      width: '100%',
      height: 'calc(100vh - 140px)', // Account for header and toolbar height
      overflow: 'hidden'
    },
    sidebar: {
      width: '250px',
      backgroundColor: 'white',
      borderRight: '1px solid #e2e8f0',
      padding: '1rem',
      flexShrink: 0
    },
    sidebarSection: {
      marginBottom: '1.5rem'
    },
    sidebarTitle: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.75rem'
    },
    toolGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.5rem'
    },
    canvasArea: {
      flex: 1,
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column' as 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      overflow: 'auto',
      minWidth: 0
    },
    canvasContainer: {
      backgroundColor: '#e5e7eb', // Gray background for the working area
      borderRadius: '0.5rem',
      padding: '2rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      position: 'relative' as 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    canvasInfo: {
      marginTop: '1rem',
      textAlign: 'center' as 'center',
      color: '#6b7280',
      fontSize: '0.875rem'
    },
    modal: {
      position: 'fixed' as 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.75rem',
      maxWidth: '400px',
      width: '90%'
    },
    modalTitle: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      color: '#1f2937'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      marginBottom: '1rem'
    },
    buttonGroup: {
      display: 'flex',
      gap: '0.75rem'
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#374151'
    }
  };

  if (!template) {
    return (
      <div style={styles.container}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <div>Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <KredivoLogo size={36} />
            <span style={styles.logoText}>Kredivo Ads Center</span>
          </div>
          
          <div style={styles.projectInfo}>
            <h1 style={styles.projectName}>{project?.name || 'Loading...'}</h1>
            <div style={styles.projectMeta}>
              <span style={{ 
                color: '#0369a1', 
                fontWeight: '500',
                backgroundColor: '#f0f9ff',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #0ea5e9',
                fontSize: '0.75rem',
                marginRight: '0.5rem'
              }}>
                📐 {canvasWidth} × {canvasHeight}px
              </span>
              {template && `Template: ${template.name} • ${template.category}`}
            </div>
          </div>

          <div style={styles.headerActions}>
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={() => setShowShortcutsHelp(true)}
              title="Keyboard shortcuts (? or F1)"
            >
              ⌨️ Help
            </button>
            <button
              style={{ 
                ...styles.button, 
                ...styles.secondaryButton,
                opacity: isSaving ? 0.7 : 1,
                backgroundColor: hasUnsavedChanges ? '#fef3c7' : styles.secondaryButton.backgroundColor,
                borderColor: hasUnsavedChanges ? '#d97706' : styles.secondaryButton.border
              }}
              onClick={saveProject}
              disabled={isSaving}
              title={lastSaved ? `Last saved: ${lastSaved}` : 'Save your design'}
            >
              {isSaving ? '💾 Saving...' : hasUnsavedChanges ? '💾 Save*' : '💾 Save'}
            </button>
            <button
              style={{ 
                ...styles.button, 
                backgroundColor: '#10b981',
                color: 'white',
                borderColor: '#10b981'
              }}
              onClick={saveAsTemplate}
              title="Save current design as a reusable template"
            >
              📑 Save as Template
            </button>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={() => exportProject('png')}
            >
              📥 Export
            </button>
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
              <button style={{ ...styles.button, ...styles.secondaryButton }}>
                ← Dashboard
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarContent}>
          <div style={styles.toolGroup}>
            <button
              style={{
                ...styles.toolButton,
                ...(selectedTool === 'select' ? styles.toolButtonActive : {})
              }}
              onClick={() => setSelectedTool('select')}
              title="Select Tool"
            >
              ↖️
            </button>
            <button
              style={{
                ...styles.toolButton,
                ...(selectedTool === 'text' ? styles.toolButtonActive : {})
              }}
              onClick={() => { setSelectedTool('text'); addText(); }}
              title="Add Text"
            >
              📝
            </button>
            <button
              style={styles.toolButton}
              onClick={() => addShape('rectangle')}
              title="Add Rectangle"
            >
              ▭
            </button>
            <button
              style={styles.toolButton}
              onClick={() => addShape('circle')}
              title="Add Circle"
            >
              ⭕
            </button>
            <button
              style={styles.toolButton}
              onClick={addImage}
              title="Add Image"
            >
              🖼️
            </button>
          </div>

          <div style={styles.toolGroup}>
            <button
              style={{
                ...styles.toolButton,
                backgroundColor: '#f0f0ff',
                borderColor: '#4f46e5',
                color: '#4f46e5'
              }}
              onClick={() => {
                // Highlight AI section in sidebar
                const aiSection = document.querySelector('[data-ai-section]');
                if (aiSection) {
                  aiSection.scrollIntoView({ behavior: 'smooth' });
                  // Add a brief highlight effect
                  aiSection.style.backgroundColor = '#e0e7ff';
                  setTimeout(() => {
                    aiSection.style.backgroundColor = '';
                  }, 1000);
                }
              }}
              title="AI Tools"
            >
              🤖 AI
            </button>
          </div>

          <div style={styles.toolGroup}>
            <button
              style={{
                ...styles.toolButton,
                opacity: canUndo ? 1 : 0.5
              }}
              onClick={undo}
              disabled={!canUndo}
              title="Undo"
            >
              ↶
            </button>
            <button
              style={{
                ...styles.toolButton,
                opacity: canRedo ? 1 : 0.5
              }}
              onClick={redo}
              disabled={!canRedo}
              title="Redo"
            >
              ↷
            </button>
          </div>

          <div style={styles.toolGroup}>
            <button style={styles.toolButton} onClick={zoomOut} title="Zoom Out">
              🔍-
            </button>
            <span style={{ fontSize: '0.75rem', minWidth: '3rem', textAlign: 'center' }}>
              {zoom}%
            </span>
            <button style={styles.toolButton} onClick={zoomIn} title="Zoom In">
              🔍+
            </button>
            <button style={styles.toolButton} onClick={resetZoom} title="Reset Zoom (100%)">
              🎯
            </button>
            <button style={styles.toolButton} onClick={fitToScreen} title="Fit to Screen">
              📐
            </button>
          </div>

          <div style={styles.toolGroup}>
            <button 
              style={styles.toolButton} 
              onClick={() => setShowCanvasSettings(true)} 
              title="Canvas Settings"
            >
              ⚙️
            </button>
            <button 
              style={{
                ...styles.toolButton,
                backgroundColor: hasOverflowObjects ? '#fbbf24' : '#f3f4f6',
                borderColor: hasOverflowObjects ? '#f59e0b' : '#d1d5db',
                color: hasOverflowObjects ? '#ffffff' : '#6b7280'
              }}
              onClick={() => {
                console.log('🔄 Recenter button clicked');
                if (canvasRef.current?.recenterOverflowObjects) {
                  canvasRef.current.recenterOverflowObjects();
                  console.log('✅ Recenter function called');
                  // Update overflow state after recentering
                  setTimeout(() => {
                    const hasOverflow = canvasRef.current?.hasOverflowObjects?.() || false;
                    console.log('📊 Overflow check result:', hasOverflow);
                    setHasOverflowObjects(hasOverflow);
                  }, 200);
                } else {
                  console.error('❌ Recenter function not available');
                }
              }}
              title={hasOverflowObjects ? "⚠️ Objects outside canvas - click to bring them back" : "🔄 Recenter objects (all objects are within canvas)"}
            >
              {hasOverflowObjects ? '⚠️' : '🔄'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Left Sidebar - Enhanced with AI Tools */}
        <div style={{ ...styles.sidebar, width: '280px' }}>
          {/* AI Tools Section */}
          <div style={styles.sidebarSection} data-ai-section>
            <h3 style={{ ...styles.sidebarTitle, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🤖 AI Tools
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Add CTA Buttons
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {/* Primary Action Buttons */}
                  <button
                    style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    onClick={() => {
                      if (canvas) {
                        const centerX = canvas.width! / 2;
                        const centerY = canvas.height! / 2;
                        
                        const ctaButton = new fabric.Rect({
                          left: centerX - 60,
                          top: centerY - 20,
                          width: 120,
                          height: 40,
                          fill: '#10b981',
                          rx: 6,
                          ry: 6
                        });
                        
                        const buttonText = new fabric.Text('DOWNLOAD', {
                          left: centerX,
                          top: centerY,
                          fontSize: 14,
                          fill: 'white',
                          fontWeight: 'bold',
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        const group = new fabric.Group([ctaButton, buttonText], {
                          left: centerX,
                          top: centerY,
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        canvas.add(group);
                        canvas.setActiveObject(group);
                        canvas.renderAll();
                      }
                    }}
                  >
                    DOWNLOAD
                  </button>

                  <button
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    onClick={() => {
                      if (canvas) {
                        const centerX = canvas.width! / 2;
                        const centerY = canvas.height! / 2;
                        
                        const ctaButton = new fabric.Rect({
                          left: centerX - 50,
                          top: centerY - 20,
                          width: 100,
                          height: 40,
                          fill: '#3b82f6',
                          rx: 6,
                          ry: 6
                        });
                        
                        const buttonText = new fabric.Text('MAKE IT', {
                          left: centerX,
                          top: centerY,
                          fontSize: 14,
                          fill: 'white',
                          fontWeight: 'bold',
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        const group = new fabric.Group([ctaButton, buttonText], {
                          left: centerX,
                          top: centerY + 60,
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        canvas.add(group);
                        canvas.setActiveObject(group);
                        canvas.renderAll();
                      }
                    }}
                  >
                    MAKE IT
                  </button>

                  <button
                    style={{
                      backgroundColor: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    onClick={() => {
                      if (canvas) {
                        const centerX = canvas.width! / 2;
                        const centerY = canvas.height! / 2;
                        
                        const ctaButton = new fabric.Rect({
                          left: centerX - 60,
                          top: centerY - 20,
                          width: 120,
                          height: 40,
                          fill: '#8b5cf6',
                          rx: 6,
                          ry: 6
                        });
                        
                        const buttonText = new fabric.Text('SUBSCRIBE', {
                          left: centerX,
                          top: centerY,
                          fontSize: 14,
                          fill: 'white',
                          fontWeight: 'bold',
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        const group = new fabric.Group([ctaButton, buttonText], {
                          left: centerX,
                          top: centerY + 120,
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        canvas.add(group);
                        canvas.setActiveObject(group);
                        canvas.renderAll();
                      }
                    }}
                  >
                    SUBSCRIBE
                  </button>

                  <button
                    style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    onClick={() => {
                      if (canvas) {
                        const centerX = canvas.width! / 2;
                        const centerY = canvas.height! / 2;
                        
                        const ctaButton = new fabric.Rect({
                          left: centerX - 50,
                          top: centerY - 20,
                          width: 100,
                          height: 40,
                          fill: '#f59e0b',
                          rx: 6,
                          ry: 6
                        });
                        
                        const buttonText = new fabric.Text('Sign up', {
                          left: centerX,
                          top: centerY,
                          fontSize: 14,
                          fill: 'white',
                          fontWeight: 'bold',
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        const group = new fabric.Group([ctaButton, buttonText], {
                          left: centerX + 150,
                          top: centerY,
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        canvas.add(group);
                        canvas.setActiveObject(group);
                        canvas.renderAll();
                      }
                    }}
                  >
                    Sign up
                  </button>

                  <button
                    style={{
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    onClick={() => {
                      if (canvas) {
                        const centerX = canvas.width! / 2;
                        const centerY = canvas.height! / 2;
                        
                        const ctaButton = new fabric.Rect({
                          left: centerX - 65,
                          top: centerY - 20,
                          width: 130,
                          height: 40,
                          fill: '#ef4444',
                          rx: 6,
                          ry: 6
                        });
                        
                        const buttonText = new fabric.Text('ADD TO CART', {
                          left: centerX,
                          top: centerY,
                          fontSize: 14,
                          fill: 'white',
                          fontWeight: 'bold',
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        const group = new fabric.Group([ctaButton, buttonText], {
                          left: centerX + 150,
                          top: centerY + 60,
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        canvas.add(group);
                        canvas.setActiveObject(group);
                        canvas.renderAll();
                      }
                    }}
                  >
                    ADD TO CART
                  </button>

                  <button
                    style={{
                      backgroundColor: '#6366f1',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    onClick={() => {
                      if (canvas) {
                        const centerX = canvas.width! / 2;
                        const centerY = canvas.height! / 2;
                        
                        const ctaButton = new fabric.Rect({
                          left: centerX - 40,
                          top: centerY - 20,
                          width: 80,
                          height: 40,
                          fill: '#6366f1',
                          rx: 6,
                          ry: 6
                        });
                        
                        const buttonText = new fabric.Text('Like', {
                          left: centerX,
                          top: centerY,
                          fontSize: 14,
                          fill: 'white',
                          fontWeight: 'bold',
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        const group = new fabric.Group([ctaButton, buttonText], {
                          left: centerX + 150,
                          top: centerY + 120,
                          originX: 'center',
                          originY: 'center'
                        });
                        
                        canvas.add(group);
                        canvas.setActiveObject(group);
                        canvas.renderAll();
                      }
                    }}
                  >
                    Like
                  </button>
                </div>
              </div>

              <button
                style={{ 
                  ...styles.button, 
                  backgroundColor: '#f0f0ff', 
                  color: '#4f46e5', 
                  border: '1px solid #4f46e5',
                  width: '100%',
                  fontSize: '0.75rem'
                }}
                onClick={() => {
                  const activeObject = canvas?.getActiveObject();
                  if (!activeObject) {
                    alert('Please select an object first');
                    return;
                  }
                  // Simulate AI translation
                  if (activeObject instanceof fabric.Text || activeObject instanceof fabric.Textbox) {
                    const currentText = (activeObject as any).text || '';
                    const translations = {
                      'KREDIVO': 'KREDIVO (Indonesia)',
                      'Your financial partner': 'Mitra keuangan Anda',
                      'Unlock Your Financial Future': 'Buka Masa Depan Keuangan Anda',
                      'Smart Credit Solutions': 'Solusi Kredit Cerdas'
                    };
                    const translatedText = translations[currentText as keyof typeof translations] || currentText + ' (Translated)';
                    (activeObject as any).set('text', translatedText);
                    canvas?.renderAll();
                  } else {
                    alert('Please select a text object to translate');
                  }
                }}
              >
                🔄 AI Translate
              </button>

              <button
                style={{ 
                  ...styles.button, 
                  backgroundColor: '#f0f0ff', 
                  color: '#4f46e5', 
                  border: '1px solid #4f46e5',
                  width: '100%',
                  fontSize: '0.75rem'
                }}
                onClick={() => {
                  const activeObject = canvas?.getActiveObject();
                  if (!activeObject || !(activeObject instanceof fabric.Image)) {
                    alert('Please select an image first');
                    return;
                  }
                  // Simulate background removal
                  const filter = new fabric.Image.filters.RemoveColor({
                    color: '#FFFFFF',
                    distance: 0.2,
                    useAlpha: true
                  });
                  (activeObject as fabric.Image).filters?.push(filter);
                  (activeObject as fabric.Image).applyFilters();
                  canvas?.renderAll();
                }}
              >
                🎭 Remove Background
              </button>
              
              <button
                style={{ 
                  ...styles.button, 
                  backgroundColor: '#f0f0ff', 
                  color: '#4f46e5', 
                  border: '1px solid #4f46e5',
                  width: '100%',
                  fontSize: '0.75rem'
                }}
                onClick={() => {
                  if (!canvas) return;
                  // Generate AI text
                  const aiTexts = [
                    'Unlock Your Financial Future with Kredivo',
                    'Smart Credit Solutions for Modern Living',
                    'Your Trusted Partner in Financial Growth'
                  ];
                  const text = aiTexts[Math.floor(Math.random() * aiTexts.length)];
                  const centerX = canvas.width! / 2;
                  const centerY = canvas.height! / 2;
                  
                  const textObj = new fabric.Text(text, {
                    left: centerX,
                    top: centerY + 100,
                    fontSize: 20,
                    fill: '#4f46e5',
                    fontWeight: 'bold',
                    originX: 'center',
                    originY: 'center',
                    selectable: true,
                    editable: true,
                  });
                  
                  canvas.add(textObj);
                  canvas.setActiveObject(textObj);
                  canvas.renderAll();
                }}
              >
                ✨ Generate AI Copy
              </button>
              
              <button
                style={{ 
                  ...styles.button, 
                  backgroundColor: '#f0f0ff', 
                  color: '#4f46e5', 
                  border: '1px solid #4f46e5',
                  width: '100%',
                  fontSize: '0.75rem'
                }}
                onClick={() => {
                  if (!canvas) return;
                  // Generate AI image (mock)
                  const mockImage = 'https://picsum.photos/300/200?random=' + Date.now();
                  fabric.Image.fromURL(mockImage, (img) => {
                    const centerX = canvas.width! / 2;
                    const centerY = canvas.height! / 2;
                    
                    img.set({
                      left: centerX - 150,
                      top: centerY - 100,
                      scaleX: 0.8,
                      scaleY: 0.8,
                    });
                    
                    canvas.add(img);
                    canvas.setActiveObject(img);
                    canvas.renderAll();
                  }, { crossOrigin: 'anonymous' });
                }}
              >
                🎨 Generate AI Image
              </button>
              
              <button
                style={{ 
                  ...styles.button, 
                  backgroundColor: '#f0f0ff', 
                  color: '#4f46e5', 
                  border: '1px solid #4f46e5',
                  width: '100%',
                  fontSize: '0.75rem'
                }}
                onClick={() => setShowCanvasSettings(true)}
              >
                📐 AI Smart Resize
              </button>
            </div>
          </div>

          {/* Quick Actions Section */}
          <div style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                style={{ ...styles.button, ...styles.secondaryButton, width: '100%' }}
                onClick={addText}
              >
                📝 Add Text
              </button>
              <button
                style={{ ...styles.button, ...styles.secondaryButton, width: '100%' }}
                onClick={addImage}
              >
                🖼️ Add Image
              </button>
              <button
                style={{ ...styles.button, ...styles.secondaryButton, width: '100%' }}
                onClick={() => addShape('rectangle')}
              >
                ▭ Add Rectangle
              </button>
              <button
                style={{ ...styles.button, ...styles.secondaryButton, width: '100%' }}
                onClick={() => addShape('circle')}
              >
                ⭕ Add Circle
              </button>
            </div>
          </div>

          <div style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>Template Info</h3>
            <div style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
              <p><strong>{template.name}</strong></p>
              <p style={{ color: '#6b7280', margin: '0.5rem 0' }}>
                {template.description}
              </p>
              <p style={{ color: '#6b7280' }}>
                Size: {canvasWidth} × {canvasHeight}px
              </p>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div style={styles.canvasArea} data-canvas-container>
          <div style={styles.canvasContainer}>
            <SimpleCanvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              onCanvasReady={handleCanvasReady}
              onSelectionChange={handleSelectionChange}
            />
          </div>
          <div style={styles.canvasInfo}>
            Canvas: {canvasWidth} × {canvasHeight}px • Zoom: {zoom}%
            {selectedObjects.length > 0 && ` • Selected: ${selectedObjects.length} object(s)`}
          </div>
        </div>

        {/* Right Sidebar - Panels */}
        <div style={{ display: 'flex', flexShrink: 0 }}>
          {/* Layers Panel */}
          <LayersPanel
            canvas={canvas}
            selectedObjects={selectedObjects}
            onLayerSelect={handleLayerSelect}
            onLayerVisibilityChange={handleLayerVisibilityChange}
            onLayerLockChange={handleLayerLockChange}
            onLayerNameChange={handleLayerNameChange}
            onLayerDelete={handleLayerDelete}
          />

          {/* Background Controls Panel */}
          <div style={{ 
            width: '280px', 
            height: 'calc(100vh - 140px)',
            backgroundColor: 'white',
            borderLeft: '1px solid #e2e8f0',
            borderRight: '1px solid #e2e8f0',
            overflowY: 'auto',
            flexShrink: 0
          }}>
            <div style={{ padding: '1rem' }}>
              <h3 style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Background
              </h3>
              
              {/* Background Color Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>Fill</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="color"
                    value={canvasBackground}
                    onChange={(e) => updateCanvasBackground(e.target.value)}
                    style={{
                      width: '40px',
                      height: '32px',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={canvasBackground}
                    onChange={(e) => {
                      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value) || e.target.value === '') {
                        updateCanvasBackground(e.target.value);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace'
                    }}
                    placeholder="#8BDFFF"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      style={{ margin: 0 }}
                    />
                    ✓
                  </label>
                </div>
              </div>
              
              {/* Border Section */}
              <div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>Border</span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={showBorder}
                    onChange={(e) => setShowBorder(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  Show border
                </label>
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          <EnterprisePropertiesPanel
            canvas={canvas}
            selectedObjects={selectedObjects}
            onObjectUpdate={handleObjectUpdate}
          />
        </div>
      </div>

      {/* Text Modal */}
      {showTextModal && (
        <div style={styles.modal} onClick={() => setShowTextModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add Text</h3>
            <input
              type="text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter your text here..."
              style={styles.input}
              autoFocus
            />
            <div style={styles.buttonGroup}>
              <button
                style={{ ...styles.button, ...styles.secondaryButton, flex: 1 }}
                onClick={() => setShowTextModal(false)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.primaryButton, flex: 1 }}
                onClick={confirmAddText}
                disabled={!textContent.trim()}
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div style={styles.modal} onClick={() => setShowImageModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add Image</h3>
            
            {/* File Upload Option */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ ...styles.label, display: 'block', marginBottom: '0.5rem' }}>
                📁 Upload from Computer
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{
                  ...styles.input,
                  padding: '0.5rem',
                  border: '2px dashed #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Supports: JPG, PNG, GIF, SVG, WebP
              </div>
            </div>

            {/* URL Option */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ ...styles.label, display: 'block', marginBottom: '0.5rem' }}>
                🌐 Or Enter Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                style={styles.input}
              />
            </div>

            <div style={styles.buttonGroup}>
              <button
                style={{ ...styles.button, ...styles.secondaryButton, flex: 1 }}
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrl('');
                }}
              >
                Cancel
              </button>
              <button
                style={{ 
                  ...styles.button, 
                  ...styles.primaryButton, 
                  flex: 1,
                  opacity: !imageUrl.trim() ? 0.5 : 1
                }}
                onClick={handleImageSubmit}
                disabled={!imageUrl.trim()}
              >
                Add from URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Settings Modal */}
      {showCanvasSettings && (
        <div style={styles.modal} onClick={() => setShowCanvasSettings(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Canvas Settings</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Canvas Width (px)</label>
              <input
                type="text"
                value={widthInput}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string or numbers only
                  if (value === '' || /^\d+$/.test(value)) {
                    setWidthInput(value);
                    
                    // Only update canvas width if it's a valid number
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 100 && numValue <= 4000) {
                      setCanvasWidth(numValue);
                    }
                  }
                }}
                onBlur={(e) => {
                  // On blur, ensure we have a valid value
                  const value = e.target.value;
                  if (value === '') {
                    setWidthInput(canvasWidth.toString());
                    return;
                  }
                  
                  const numValue = parseInt(value);
                  if (isNaN(numValue) || numValue < 100) {
                    setWidthInput('100');
                    setCanvasWidth(100);
                  } else if (numValue > 4000) {
                    setWidthInput('4000');
                    setCanvasWidth(4000);
                  } else {
                    setWidthInput(numValue.toString());
                    setCanvasWidth(numValue);
                  }
                }}
                style={styles.input}
                placeholder="Enter width (100-4000)"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Canvas Height (px)</label>
              <input
                type="text"
                value={heightInput}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string or numbers only
                  if (value === '' || /^\d+$/.test(value)) {
                    setHeightInput(value);
                    
                    // Only update canvas height if it's a valid number
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 100 && numValue <= 4000) {
                      setCanvasHeight(numValue);
                    }
                  }
                }}
                onBlur={(e) => {
                  // On blur, ensure we have a valid value
                  const value = e.target.value;
                  if (value === '') {
                    setHeightInput(canvasHeight.toString());
                    return;
                  }
                  
                  const numValue = parseInt(value);
                  if (isNaN(numValue) || numValue < 100) {
                    setHeightInput('100');
                    setCanvasHeight(100);
                  } else if (numValue > 4000) {
                    setHeightInput('4000');
                    setCanvasHeight(4000);
                  } else {
                    setHeightInput(numValue.toString());
                    setCanvasHeight(numValue);
                  }
                }}
                style={styles.input}
                placeholder="Enter height (100-4000)"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <input
                  type="checkbox"
                  checked={useSmartResize}
                  onChange={(e) => setUseSmartResize(e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                🤖 AI Smart Resize (automatically adjust all layers)
              </label>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>
                When enabled, all objects will be intelligently repositioned and resized to fit the new canvas dimensions.
              </div>
            </div>

            <div style={styles.formGroup}>
              <div style={styles.label}>Common Sizes:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton, fontSize: '0.7rem' }}
                  onClick={() => { 
                    setCanvasWidth(1920); 
                    setCanvasHeight(1080); 
                    setWidthInput('1920'); 
                    setHeightInput('1080'); 
                  }}
                >
                  HD (1920×1080)
                </button>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton, fontSize: '0.7rem' }}
                  onClick={() => { 
                    setCanvasWidth(1080); 
                    setCanvasHeight(1080); 
                    setWidthInput('1080'); 
                    setHeightInput('1080'); 
                  }}
                >
                  Square (1080×1080)
                </button>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton, fontSize: '0.7rem' }}
                  onClick={() => { 
                    setCanvasWidth(1200); 
                    setCanvasHeight(630); 
                    setWidthInput('1200'); 
                    setHeightInput('630'); 
                  }}
                >
                  Facebook Cover
                </button>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton, fontSize: '0.7rem' }}
                  onClick={() => { 
                    setCanvasWidth(800); 
                    setCanvasHeight(600); 
                    setWidthInput('800'); 
                    setHeightInput('600'); 
                  }}
                >
                  Default (800×600)
                </button>
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button
                style={{ ...styles.button, ...styles.secondaryButton, flex: 1 }}
                onClick={() => setShowCanvasSettings(false)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.primaryButton, flex: 1 }}
                onClick={() => {
                  setShowCanvasSettings(false);
                  // Use smart resize or regular resize based on setting
                  if (canvasRef.current) {
                    if (useSmartResize && canvasRef.current.smartResizeCanvas) {
                      canvasRef.current.smartResizeCanvas(canvasWidth, canvasHeight);
                    } else if (canvasRef.current.resizeCanvas) {
                      canvasRef.current.resizeCanvas(canvasWidth, canvasHeight);
                    }
                  }
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Help Modal */}
      <ShortcutsHelp 
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
}