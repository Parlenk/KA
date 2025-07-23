/**
 * WebGL Canvas Renderer for High Performance
 * Optimized rendering engine for large designs with many objects
 */

export interface RenderObject {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'image' | 'path';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
  zIndex: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  data?: any; // Type-specific data
}

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WebGLCanvasRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private buffers: Map<string, WebGLBuffer> = new Map();
  private textures: Map<string, WebGLTexture> = new Map();
  
  // Performance optimization
  private objectPool: RenderObject[] = [];
  private visibleObjects: RenderObject[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 0;
  
  // Viewport and camera
  private viewport: ViewportBounds = { x: 0, y: 0, width: 0, height: 0 };
  private camera = { x: 0, y: 0, zoom: 1 };
  private dirty = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Initialize WebGL context
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    this.gl = gl;
    this.initializeWebGL();
    this.setupEventListeners();
  }

  private initializeWebGL(): void {
    const { gl } = this;
    
    // Basic vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      
      uniform vec2 u_resolution;
      uniform mat3 u_transform;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        vec3 position = u_transform * vec3(a_position, 1.0);
        
        // Convert from pixels to clip space
        vec2 clipSpace = ((position.xy / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec3(1, -1, 1), 1.0);
        
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `;
    
    // Basic fragment shader with texture support
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform bool u_useTexture;
      uniform float u_opacity;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        vec4 color = v_color;
        
        if (u_useTexture) {
          color = texture2D(u_texture, v_texCoord);
        }
        
        gl_FragColor = color * u_opacity;
      }
    `;
    
    // Create and compile shaders
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to create shaders');
    }
    
    // Create program
    this.program = this.createProgram(vertexShader, fragmentShader);
    if (!this.program) {
      throw new Error('Failed to create WebGL program');
    }
    
    // Initialize buffers
    this.initializeBuffers();
    
    // Setup blend mode for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = this.gl.createProgram();
    if (!program) return null;
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program linking error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }

  private initializeBuffers(): void {
    const { gl } = this;
    
    // Position buffer
    const positionBuffer = gl.createBuffer();
    if (positionBuffer) {
      this.buffers.set('position', positionBuffer);
    }
    
    // Texture coordinate buffer
    const texCoordBuffer = gl.createBuffer();
    if (texCoordBuffer) {
      this.buffers.set('texCoord', texCoordBuffer);
    }
    
    // Color buffer
    const colorBuffer = gl.createBuffer();
    if (colorBuffer) {
      this.buffers.set('color', colorBuffer);
    }
  }

  private setupEventListeners(): void {
    // Handle canvas resize
    const resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    resizeObserver.observe(this.canvas);
    
    // Initial resize
    this.handleResize();
  }

  private handleResize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.viewport = {
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height
    };
    
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.dirty = true;
  }

  /**
   * Perform frustum culling to only render visible objects
   */
  private cullObjects(objects: RenderObject[]): RenderObject[] {
    const { camera, viewport } = this;
    
    // Calculate camera bounds with some padding for smooth scrolling
    const padding = 100;
    const cameraBounds = {
      left: camera.x - padding,
      top: camera.y - padding,
      right: camera.x + viewport.width / camera.zoom + padding,
      bottom: camera.y + viewport.height / camera.zoom + padding
    };
    
    return objects.filter(obj => {
      if (!obj.visible) return false;
      
      // Check if object intersects with camera bounds
      const objRight = obj.x + obj.width * obj.scaleX;
      const objBottom = obj.y + obj.height * obj.scaleY;
      
      return !(
        obj.x > cameraBounds.right ||
        objRight < cameraBounds.left ||
        obj.y > cameraBounds.bottom ||
        objBottom < cameraBounds.top
      );
    });
  }

  /**
   * Render objects with batching for performance
   */
  private renderObjects(objects: RenderObject[]): void {
    if (!this.program) return;
    
    const { gl } = this;
    
    gl.useProgram(this.program);
    
    // Set uniforms
    const resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
    gl.uniform2f(resolutionLocation, this.viewport.width, this.viewport.height);
    
    // Create transform matrix for camera
    const transform = this.createTransformMatrix();
    const transformLocation = gl.getUniformLocation(this.program, 'u_transform');
    gl.uniformMatrix3fv(transformLocation, false, transform);
    
    // Batch objects by type for efficient rendering
    const batches = this.batchObjectsByType(objects);
    
    for (const batch of batches) {
      this.renderBatch(batch);
    }
  }

  private batchObjectsByType(objects: RenderObject[]): RenderObject[][] {
    const batches: { [key: string]: RenderObject[] } = {};
    
    for (const obj of objects) {
      if (!batches[obj.type]) {
        batches[obj.type] = [];
      }
      batches[obj.type].push(obj);
    }
    
    return Object.values(batches);
  }

  private renderBatch(objects: RenderObject[]): void {
    if (objects.length === 0) return;
    
    const type = objects[0].type;
    
    switch (type) {
      case 'rectangle':
        this.renderRectangles(objects);
        break;
      case 'circle':
        this.renderCircles(objects);
        break;
      case 'text':
        this.renderTexts(objects);
        break;
      case 'image':
        this.renderImages(objects);
        break;
      case 'path':
        this.renderPaths(objects);
        break;
    }
  }

  private renderRectangles(rectangles: RenderObject[]): void {
    const { gl } = this;
    if (!this.program) return;
    
    // Batch all rectangles into single draw call
    const positions: number[] = [];
    const colors: number[] = [];
    
    for (const rect of rectangles) {
      // Create quad vertices
      const x1 = rect.x;
      const y1 = rect.y;
      const x2 = rect.x + rect.width * rect.scaleX;
      const y2 = rect.y + rect.height * rect.scaleY;
      
      // Two triangles per rectangle
      positions.push(
        x1, y1,  x2, y1,  x1, y2,  // Triangle 1
        x1, y2,  x2, y1,  x2, y2   // Triangle 2
      );
      
      // Parse color
      const color = this.parseColor(rect.fill || '#000000', rect.opacity);
      
      // 6 vertices per rectangle
      for (let i = 0; i < 6; i++) {
        colors.push(...color);
      }
    }
    
    // Upload position data
    const positionBuffer = this.buffers.get('position');
    if (positionBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
      
      const positionLocation = gl.getAttribLocation(this.program, 'a_position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }
    
    // Upload color data
    const colorBuffer = this.buffers.get('color');
    if (colorBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
      
      const colorLocation = gl.getAttribLocation(this.program, 'a_color');
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
    }
    
    // Set texture uniform
    const useTextureLocation = gl.getUniformLocation(this.program, 'u_useTexture');
    gl.uniform1i(useTextureLocation, 0);
    
    // Draw all rectangles in one call
    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
  }

  private renderCircles(circles: RenderObject[]): void {
    // Implement circle rendering using triangulated geometry
    // This would create a polygon approximation of circles
    // For brevity, using rectangle rendering as placeholder
    this.renderRectangles(circles);
  }

  private renderTexts(texts: RenderObject[]): void {
    // Text rendering would use texture atlas or canvas-based text rendering
    // This is complex and would integrate with text measurement/layout
    console.log('Text rendering not implemented in WebGL renderer');
  }

  private renderImages(images: RenderObject[]): void {
    // Image rendering would load textures and render textured quads
    console.log('Image rendering not implemented in WebGL renderer');
  }

  private renderPaths(paths: RenderObject[]): void {
    // Path rendering would tessellate paths into triangles
    console.log('Path rendering not implemented in WebGL renderer');
  }

  private createTransformMatrix(): Float32Array {
    const { camera } = this;
    
    // Create transformation matrix for camera
    const mat = new Float32Array(9);
    
    // Scale
    mat[0] = camera.zoom; mat[1] = 0; mat[2] = 0;
    mat[3] = 0; mat[4] = camera.zoom; mat[5] = 0;
    mat[6] = -camera.x * camera.zoom; mat[7] = -camera.y * camera.zoom; mat[8] = 1;
    
    return mat;
  }

  private parseColor(colorString: string, opacity: number): number[] {
    // Simple color parsing - in production use a proper color parser
    let r = 0, g = 0, b = 0;
    
    if (colorString.startsWith('#')) {
      const hex = colorString.slice(1);
      r = parseInt(hex.slice(0, 2), 16) / 255;
      g = parseInt(hex.slice(2, 4), 16) / 255;
      b = parseInt(hex.slice(4, 6), 16) / 255;
    }
    
    return [r, g, b, opacity];
  }

  /**
   * Main render method
   */
  public render(objects: RenderObject[]): void {
    if (!this.dirty && objects === this.objectPool) {
      return; // Skip render if nothing changed
    }
    
    const now = performance.now();
    
    // Update FPS counter
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
    
    const { gl } = this;
    
    // Clear canvas
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Cull objects outside viewport
    this.visibleObjects = this.cullObjects(objects);
    
    // Sort objects by z-index for proper layering
    this.visibleObjects.sort((a, b) => a.zIndex - b.zIndex);
    
    // Render visible objects
    this.renderObjects(this.visibleObjects);
    
    this.objectPool = objects;
    this.dirty = false;
  }

  /**
   * Update camera position and zoom
   */
  public setCamera(x: number, y: number, zoom: number): void {
    this.camera = { x, y, zoom };
    this.dirty = true;
  }

  /**
   * Mark renderer as dirty to force re-render
   */
  public markDirty(): void {
    this.dirty = true;
  }

  /**
   * Get performance stats
   */
  public getStats(): { fps: number; visibleObjects: number; totalObjects: number } {
    return {
      fps: this.fps,
      visibleObjects: this.visibleObjects.length,
      totalObjects: this.objectPool.length
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    const { gl } = this;
    
    // Delete buffers
    for (const buffer of this.buffers.values()) {
      gl.deleteBuffer(buffer);
    }
    this.buffers.clear();
    
    // Delete textures
    for (const texture of this.textures.values()) {
      gl.deleteTexture(texture);
    }
    this.textures.clear();
    
    // Delete program
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}