import React, { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { DesignCanvas, DesignObject } from '../../types/design';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateObject, selectObjects } from '../../store/slices/designSlice';

interface CanvasRendererProps {
  canvas: DesignCanvas;
  scale: number;
  isActive: boolean;
  className?: string;
  onObjectsChange?: (objects: DesignObject[]) => void;
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  canvas,
  scale,
  isActive,
  className = '',
  onObjectsChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const dispatch = useDispatch();
  
  const { selectedObjectIds } = useSelector((state: RootState) => state.design);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Clean up existing canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    // Create new Fabric.js canvas
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: canvas.width * scale,
      height: canvas.height * scale,
      backgroundColor: canvas.background.value,
      preserveObjectStacking: true,
      selection: isActive,
      interactive: isActive,
    });

    fabricCanvasRef.current = fabricCanvas;

    // Set up event handlers only for active canvas
    if (isActive) {
      setupEventHandlers(fabricCanvas);
    }

    // Load objects onto canvas
    loadObjectsToCanvas(fabricCanvas, canvas.objects, scale);

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [canvas.id, scale, isActive]);

  // Update canvas background when it changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setBackgroundColor(canvas.background.value, () => {
        fabricCanvasRef.current?.renderAll();
      });
    }
  }, [canvas.background]);

  // Update selection when selectedObjectIds changes
  useEffect(() => {
    if (!fabricCanvasRef.current || !isActive) return;

    const fabricCanvas = fabricCanvasRef.current;
    const selection = new fabric.ActiveSelection();
    
    selectedObjectIds.forEach(objectId => {
      const fabricObject = fabricCanvas.getObjects().find(
        obj => (obj as any).objectId === objectId
      );
      if (fabricObject) {
        selection.add(fabricObject);
      }
    });

    if (selection.size() > 0) {
      fabricCanvas.setActiveObject(selection);
    } else {
      fabricCanvas.discardActiveObject();
    }
    
    fabricCanvas.renderAll();
  }, [selectedObjectIds, isActive]);

  const setupEventHandlers = useCallback((fabricCanvas: fabric.Canvas) => {
    // Object selection
    fabricCanvas.on('selection:created', (e) => {
      const activeObject = e.selected?.[0];
      if (activeObject) {
        const objectIds = e.selected.map(obj => (obj as any).objectId).filter(Boolean);
        dispatch(selectObjects(objectIds));
      }
    });

    fabricCanvas.on('selection:updated', (e) => {
      const objectIds = e.selected?.map(obj => (obj as any).objectId).filter(Boolean) || [];
      dispatch(selectObjects(objectIds));
    });

    fabricCanvas.on('selection:cleared', () => {
      dispatch(selectObjects([]));
    });

    // Object modification
    fabricCanvas.on('object:modified', (e) => {
      const fabricObject = e.target;
      if (!fabricObject || !(fabricObject as any).objectId) return;

      const objectId = (fabricObject as any).objectId;
      const properties = extractObjectProperties(fabricObject, scale);
      
      dispatch(updateObject({
        canvasId: canvas.id,
        objectId,
        properties,
      }));

      // Notify parent component
      if (onObjectsChange) {
        const updatedObjects = fabricCanvas.getObjects().map(obj => 
          fabricObjectToDesignObject(obj as any, scale)
        );
        onObjectsChange(updatedObjects);
      }
    });

    // Object moving (real-time updates)
    fabricCanvas.on('object:moving', (e) => {
      const fabricObject = e.target;
      if (!fabricObject || !(fabricObject as any).objectId) return;

      const objectId = (fabricObject as any).objectId;
      const properties = {
        x: (fabricObject.left || 0) / scale,
        y: (fabricObject.top || 0) / scale,
      };
      
      dispatch(updateObject({
        canvasId: canvas.id,
        objectId,
        properties,
      }));
    });

    // Object scaling
    fabricCanvas.on('object:scaling', (e) => {
      const fabricObject = e.target;
      if (!fabricObject || !(fabricObject as any).objectId) return;

      const objectId = (fabricObject as any).objectId;
      const properties = {
        width: (fabricObject.width || 0) * (fabricObject.scaleX || 1) / scale,
        height: (fabricObject.height || 0) * (fabricObject.scaleY || 1) / scale,
        scaleX: fabricObject.scaleX || 1,
        scaleY: fabricObject.scaleY || 1,
      };
      
      dispatch(updateObject({
        canvasId: canvas.id,
        objectId,
        properties,
      }));
    });

    // Object rotation
    fabricCanvas.on('object:rotating', (e) => {
      const fabricObject = e.target;
      if (!fabricObject || !(fabricObject as any).objectId) return;

      const objectId = (fabricObject as any).objectId;
      const properties = {
        rotation: fabricObject.angle || 0,
      };
      
      dispatch(updateObject({
        canvasId: canvas.id,
        objectId,
        properties,
      }));
    });
  }, [canvas.id, scale, dispatch, onObjectsChange]);

  const loadObjectsToCanvas = useCallback(
    (fabricCanvas: fabric.Canvas, objects: DesignObject[], canvasScale: number) => {
      fabricCanvas.clear();

      objects.forEach(designObject => {
        const fabricObject = createFabricObject(designObject, canvasScale);
        if (fabricObject) {
          (fabricObject as any).objectId = designObject.id;
          fabricCanvas.add(fabricObject);
        }
      });

      fabricCanvas.renderAll();
    },
    []
  );

  const createFabricObject = (designObject: DesignObject, canvasScale: number): fabric.Object | null => {
    const { type, properties } = designObject;
    const scaledProps = {
      left: (properties.x || 0) * canvasScale,
      top: (properties.y || 0) * canvasScale,
      width: (properties.width || 0) * canvasScale,
      height: (properties.height || 0) * canvasScale,
      angle: properties.rotation || 0,
      opacity: properties.opacity || 1,
      scaleX: properties.scaleX || 1,
      scaleY: properties.scaleY || 1,
    };

    switch (type) {
      case 'text':
        return new fabric.Text(properties.text || 'Text', {
          ...scaledProps,
          fontSize: (properties.fontSize || 16) * canvasScale,
          fontFamily: properties.fontFamily || 'Arial',
          fontWeight: properties.fontWeight || 'normal',
          fontStyle: properties.fontStyle || 'normal',
          fill: properties.fill || '#000000',
          textAlign: properties.textAlign || 'left',
        });

      case 'rectangle':
        return new fabric.Rect({
          ...scaledProps,
          fill: properties.fill || '#ffffff',
          stroke: properties.stroke || '#000000',
          strokeWidth: (properties.strokeWidth || 0) * canvasScale,
          rx: (properties.cornerRadius || 0) * canvasScale,
          ry: (properties.cornerRadius || 0) * canvasScale,
        });

      case 'circle':
        return new fabric.Circle({
          ...scaledProps,
          radius: (properties.radius || properties.width / 2 || 50) * canvasScale,
          fill: properties.fill || '#ffffff',
          stroke: properties.stroke || '#000000',
          strokeWidth: (properties.strokeWidth || 0) * canvasScale,
        });

      case 'ellipse':
        return new fabric.Ellipse({
          ...scaledProps,
          rx: (properties.width / 2 || 50) * canvasScale,
          ry: (properties.height / 2 || 30) * canvasScale,
          fill: properties.fill || '#ffffff',
          stroke: properties.stroke || '#000000',
          strokeWidth: (properties.strokeWidth || 0) * canvasScale,
        });

      case 'line':
        return new fabric.Line([
          (properties.x1 || 0) * canvasScale,
          (properties.y1 || 0) * canvasScale,
          (properties.x2 || 100) * canvasScale,
          (properties.y2 || 100) * canvasScale,
        ], {
          stroke: properties.stroke || '#000000',
          strokeWidth: (properties.strokeWidth || 1) * canvasScale,
        });

      case 'image':
        if (properties.src) {
          return new Promise<fabric.Image>((resolve) => {
            fabric.Image.fromURL(properties.src, (img) => {
              img.set({
                ...scaledProps,
                crossOrigin: 'anonymous',
              });
              resolve(img);
            });
          }) as any;
        }
        break;

      default:
        console.warn(`Unknown object type: ${type}`);
        return null;
    }

    return null;
  };

  const extractObjectProperties = (fabricObject: fabric.Object, canvasScale: number) => {
    const props: any = {
      x: (fabricObject.left || 0) / canvasScale,
      y: (fabricObject.top || 0) / canvasScale,
      width: (fabricObject.width || 0) / canvasScale,
      height: (fabricObject.height || 0) / canvasScale,
      rotation: fabricObject.angle || 0,
      opacity: fabricObject.opacity || 1,
      scaleX: fabricObject.scaleX || 1,
      scaleY: fabricObject.scaleY || 1,
    };

    // Type-specific properties
    if (fabricObject instanceof fabric.Text) {
      props.text = fabricObject.text;
      props.fontSize = (fabricObject.fontSize || 16) / canvasScale;
      props.fontFamily = fabricObject.fontFamily;
      props.fontWeight = fabricObject.fontWeight;
      props.fontStyle = fabricObject.fontStyle;
      props.fill = fabricObject.fill;
      props.textAlign = fabricObject.textAlign;
    } else if (fabricObject instanceof fabric.Rect) {
      props.fill = fabricObject.fill;
      props.stroke = fabricObject.stroke;
      props.strokeWidth = (fabricObject.strokeWidth || 0) / canvasScale;
      props.cornerRadius = (fabricObject.rx || 0) / canvasScale;
    } else if (fabricObject instanceof fabric.Circle) {
      props.radius = (fabricObject.radius || 0) / canvasScale;
      props.fill = fabricObject.fill;
      props.stroke = fabricObject.stroke;
      props.strokeWidth = (fabricObject.strokeWidth || 0) / canvasScale;
    } else if (fabricObject instanceof fabric.Ellipse) {
      props.fill = fabricObject.fill;
      props.stroke = fabricObject.stroke;
      props.strokeWidth = (fabricObject.strokeWidth || 0) / canvasScale;
    } else if (fabricObject instanceof fabric.Line) {
      props.stroke = fabricObject.stroke;
      props.strokeWidth = (fabricObject.strokeWidth || 0) / canvasScale;
    } else if (fabricObject instanceof fabric.Image) {
      props.src = (fabricObject as any).src;
    }

    return props;
  };

  const fabricObjectToDesignObject = (fabricObject: any, canvasScale: number): DesignObject => {
    return {
      id: fabricObject.objectId,
      type: getObjectType(fabricObject),
      layerIndex: 0, // Will be set based on canvas order
      locked: false,
      visible: true,
      properties: extractObjectProperties(fabricObject, canvasScale),
    };
  };

  const getObjectType = (fabricObject: fabric.Object): string => {
    if (fabricObject instanceof fabric.Text) return 'text';
    if (fabricObject instanceof fabric.Rect) return 'rectangle';
    if (fabricObject instanceof fabric.Circle) return 'circle';
    if (fabricObject instanceof fabric.Ellipse) return 'ellipse';
    if (fabricObject instanceof fabric.Line) return 'line';
    if (fabricObject instanceof fabric.Image) return 'image';
    return 'unknown';
  };

  return (
    <div className={`canvas-container ${className}`}>
      <canvas
        ref={canvasRef}
        className={`border border-gray-300 ${isActive ? 'shadow-md' : 'shadow-sm'}`}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      />
      {!isActive && (
        <div className="absolute inset-0 bg-transparent cursor-pointer" />
      )}
    </div>
  );
};

export default CanvasRenderer;