import React, { useRef, useEffect, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { CanvasPerformanceOptimizer, useCanvasPerformance } from '../../utils/canvasPerformance';

interface WebGLCanvasRendererProps {
  width: number;
  height: number;
  onCanvasReady: (canvas: fabric.Canvas) => void;
  objects?: any[];
  zoom?: number;
  pan?: { x: number; y: number };
  enableWebGL?: boolean;
  performanceMode?: boolean;
}

interface WebGLContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffers: {
    position: WebGLBuffer;
    texture: WebGLBuffer;
  };
  uniforms: {
    uTransform: WebGLUniformLocation;
    uSampler: WebGLUniformLocation;
    uOpacity: WebGLUniformLocation;
  };
}

const WebGLCanvasRenderer: React.FC<WebGLCanvasRendererProps> = ({
  width,
  height,
  onCanvasReady,
  objects = [],
  zoom = 1,
  pan = { x: 0, y: 0 },
  enableWebGL = false,
  performanceMode = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const webglContextRef = useRef<WebGLContext | null>(null);
  const animationFrameRef = useRef<number>();
  
  const [isWebGLSupported, setIsWebGLSupported] = useState(false);
  const [renderMode, setRenderMode] = useState<'canvas' | 'webgl'>('canvas');
  
  const { optimizer, metrics, averageFrameRate, memoryUsage } = useCanvasPerformance(
    fabricCanvasRef.current
  );

  // Initialize WebGL context
  const initWebGL = useCallback(() => {
    if (!webglCanvasRef.current) return false;

    const gl = webglCanvasRef.current.getContext('webgl');
    if (!gl) return false;

    // Vertex shader source
    const vertexShaderSource = `
      attribute vec4 aVertexPosition;
      attribute vec2 aTextureCoord;
      
      uniform mat4 uTransform;
      
      varying highp vec2 vTextureCoord;
      
      void main(void) {
        gl_Position = uTransform * aVertexPosition;
        vTextureCoord = aTextureCoord;
      }
    `;

    // Fragment shader source
    const fragmentShaderSource = `
      varying highp vec2 vTextureCoord;
      
      uniform sampler2D uSampler;
      uniform highp float uOpacity;
      
      void main(void) {
        highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor = vec4(texelColor.rgb, texelColor.a * uOpacity);
      }
    `;

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return false;

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return false;

    // Create buffers
    const positionBuffer = gl.createBuffer();
    const textureBuffer = gl.createBuffer();
    
    if (!positionBuffer || !textureBuffer) return false;

    // Get uniform locations
    const uTransform = gl.getUniformLocation(program, 'uTransform');
    const uSampler = gl.getUniformLocation(program, 'uSampler');
    const uOpacity = gl.getUniformLocation(program, 'uOpacity');
    
    if (!uTransform || !uSampler || !uOpacity) return false;

    webglContextRef.current = {
      gl,
      program,
      buffers: {
        position: positionBuffer,
        texture: textureBuffer
      },
      uniforms: {
        uTransform,
        uSampler,
        uOpacity
      }
    };

    setIsWebGLSupported(true);
    return true;
  }, []);

  // Create shader helper function
  const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  };

  // Create program helper function
  const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  };

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      preserveObjectStacking: true,
      renderOnAddRemove: false, // Manual control for performance
      skipTargetFind: performanceMode, // Skip hit detection in performance mode
      imageSmoothingEnabled: !performanceMode,
      enableRetinaScaling: !performanceMode
    });

    // Configure for performance
    if (performanceMode) {
      canvas.selection = false;
      canvas.hoverCursor = 'default';
      canvas.moveCursor = 'default';
    }

    fabricCanvasRef.current = canvas;
    onCanvasReady(canvas);

    // Initialize WebGL if enabled and supported
    if (enableWebGL) {
      initWebGL();
    }

    return () => {
      canvas.dispose();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height, enableWebGL, performanceMode, initWebGL, onCanvasReady]);

  // Render objects using WebGL
  const renderWithWebGL = useCallback(() => {
    if (!webglContextRef.current || !fabricCanvasRef.current) return;

    const { gl, program, buffers, uniforms } = webglContextRef.current;
    const canvas = fabricCanvasRef.current;

    // Clear canvas
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use shader program
    gl.useProgram(program);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Render each object
    canvas.getObjects().forEach((obj, index) => {
      if (!obj.visible) return;

      renderObjectWebGL(obj, gl, program, buffers, uniforms);
    });
  }, [width, height]);

  // Render individual object with WebGL
  const renderObjectWebGL = (
    obj: fabric.Object,
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    buffers: any,
    uniforms: any
  ) => {
    // Convert Fabric.js object to WebGL-renderable format
    const bounds = obj.getBoundingRect();
    
    // Create vertex positions
    const positions = new Float32Array([
      bounds.left, bounds.top,
      bounds.left + bounds.width, bounds.top,
      bounds.left, bounds.top + bounds.height,
      bounds.left + bounds.width, bounds.top + bounds.height
    ]);

    // Create texture coordinates
    const textureCoords = new Float32Array([
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      1.0, 1.0
    ]);

    // Bind position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionAttribute = gl.getAttribLocation(program, 'aVertexPosition');
    gl.enableVertexAttribArray(positionAttribute);
    gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

    // Bind texture coordinate buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture);
    gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.STATIC_DRAW);
    
    const textureAttribute = gl.getAttribLocation(program, 'aTextureCoord');
    gl.enableVertexAttribArray(textureAttribute);
    gl.vertexAttribPointer(textureAttribute, 2, gl.FLOAT, false, 0, 0);

    // Set transform matrix
    const transform = obj.calcTransformMatrix();
    gl.uniformMatrix4fv(uniforms.uTransform, false, new Float32Array([
      transform[0], transform[1], 0, 0,
      transform[2], transform[3], 0, 0,
      0, 0, 1, 0,
      transform[4], transform[5], 0, 1
    ]));

    // Set opacity
    gl.uniform1f(uniforms.uOpacity, obj.opacity || 1.0);

    // Create texture from object (simplified)
    const texture = createTextureFromObject(gl, obj);
    if (texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniforms.uSampler, 0);
      
      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };

  // Create texture from Fabric.js object
  const createTextureFromObject = (gl: WebGLRenderingContext, obj: fabric.Object): WebGLTexture | null => {
    // This is a simplified implementation
    // In a real scenario, you'd render the object to a canvas and use that as texture
    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // For now, create a simple colored texture
    const color = obj.fill as string || '#000000';
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 64, 64);
      
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    
    return texture;
  };

  // Adaptive rendering based on performance
  const adaptiveRender = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const objectCount = canvas.getObjects().length;
    const currentFps = averageFrameRate;

    // Switch render mode based on complexity and performance
    if (enableWebGL && isWebGLSupported && objectCount > 50 && currentFps < 30) {
      setRenderMode('webgl');
      renderWithWebGL();
    } else {
      setRenderMode('canvas');
      canvas.renderAll();
    }

    // Apply performance optimizations
    if (optimizer) {
      if (objectCount > 100) {
        optimizer.optimizeForComplexDesign();
      }
      
      if (currentFps < 20) {
        optimizer.enablePerformanceMode(true);
      } else if (currentFps > 50) {
        optimizer.enablePerformanceMode(false);
      }
    }

    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(adaptiveRender);
  }, [enableWebGL, isWebGLSupported, averageFrameRate, optimizer, renderWithWebGL]);

  // Start adaptive rendering
  useEffect(() => {
    if (fabricCanvasRef.current) {
      adaptiveRender();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [adaptiveRender]);

  // Performance monitoring component
  const PerformanceMonitor = () => (
    <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
      <div>Mode: {renderMode.toUpperCase()}</div>
      <div>FPS: {averageFrameRate.toFixed(1)}</div>
      <div>Objects: {fabricCanvasRef.current?.getObjects().length || 0}</div>
      <div>Memory: {(memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
      {metrics.length > 0 && (
        <div>Render: {metrics[metrics.length - 1]?.renderTime.toFixed(2)}ms</div>
      )}
    </div>
  );

  return (
    <div className="relative" style={{ width, height }}>
      {/* Main Fabric.js canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ 
          display: renderMode === 'canvas' ? 'block' : 'none',
          imageRendering: performanceMode ? 'pixelated' : 'auto'
        }}
      />
      
      {/* WebGL canvas overlay */}
      {enableWebGL && (
        <canvas
          ref={webglCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0"
          style={{ 
            display: renderMode === 'webgl' ? 'block' : 'none',
            pointerEvents: 'none' // Let Fabric.js handle interactions
          }}
        />
      )}

      {/* Performance monitor in development */}
      {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
    </div>
  );
};

export default WebGLCanvasRenderer;