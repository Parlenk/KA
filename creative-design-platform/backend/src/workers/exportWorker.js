const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const puppeteer = require('puppeteer');

class ExportWorker {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async processJob(job) {
    try {
      await this.initialize();
      
      const { designId, formats, settings, canvas } = job.data;
      const outputs = [];

      for (const format of formats) {
        const output = await this.exportFormat(designId, format, settings, canvas);
        outputs.push(output);
      }

      return { success: true, outputs };
    } catch (error) {
      console.error('Export worker error:', error);
      throw error;
    }
  }

  async exportFormat(designId, format, settings, canvas) {
    switch (format) {
      case 'png':
      case 'jpg':
        return await this.exportImage(designId, format, settings, canvas);
      case 'svg':
        return await this.exportSVG(designId, settings, canvas);
      case 'pdf':
        return await this.exportPDF(designId, settings, canvas);
      case 'html5':
        return await this.exportHTML5(designId, settings, canvas);
      case 'mp4':
        return await this.exportVideo(designId, 'mp4', settings, canvas);
      case 'gif':
        return await this.exportGIF(designId, settings, canvas);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  async exportImage(designId, format, settings, canvas) {
    const page = await this.browser.newPage();
    
    try {
      // Set viewport to canvas size
      await page.setViewport({
        width: canvas.width * (settings.scale || 1),
        height: canvas.height * (settings.scale || 1),
        deviceScaleFactor: settings.scale || 1
      });

      // Generate HTML content
      const html = this.generateCanvasHTML(canvas, settings);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Capture screenshot
      const buffer = await page.screenshot({
        type: format === 'jpg' ? 'jpeg' : 'png',
        quality: format === 'jpg' ? settings.quality || 90 : undefined,
        omitBackground: settings.transparent && format === 'png'
      });

      // Optimize if needed
      let finalBuffer = buffer;
      if (settings.optimize) {
        finalBuffer = await this.optimizeImage(buffer, format, settings);
      }

      const filename = `design-${designId}.${format}`;
      const filePath = await this.saveFile(filename, finalBuffer);

      return {
        format,
        filename,
        url: this.getFileUrl(filePath),
        size: finalBuffer.length,
        mimeType: format === 'jpg' ? 'image/jpeg' : 'image/png'
      };
    } finally {
      await page.close();
    }
  }

  async exportSVG(designId, settings, canvas) {
    const svg = this.generateCanvasSVG(canvas, settings);
    const buffer = Buffer.from(svg, 'utf8');
    
    const filename = `design-${designId}.svg`;
    const filePath = await this.saveFile(filename, buffer);

    return {
      format: 'svg',
      filename,
      url: this.getFileUrl(filePath),
      size: buffer.length,
      mimeType: 'image/svg+xml'
    };
  }

  async exportPDF(designId, settings, canvas) {
    const page = await this.browser.newPage();
    
    try {
      await page.setViewport({
        width: canvas.width,
        height: canvas.height
      });

      const html = this.generateCanvasHTML(canvas, settings);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const buffer = await page.pdf({
        width: `${canvas.width}px`,
        height: `${canvas.height}px`,
        printBackground: true
      });

      const filename = `design-${designId}.pdf`;
      const filePath = await this.saveFile(filename, buffer);

      return {
        format: 'pdf',
        filename,
        url: this.getFileUrl(filePath),
        size: buffer.length,
        mimeType: 'application/pdf'
      };
    } finally {
      await page.close();
    }
  }

  async exportHTML5(designId, settings, canvas) {
    const html = this.generateHTML5Package(canvas, settings);
    const buffer = Buffer.from(html, 'utf8');
    
    const filename = `design-${designId}.html`;
    const filePath = await this.saveFile(filename, buffer);

    return {
      format: 'html5',
      filename,
      url: this.getFileUrl(filePath),
      size: buffer.length,
      mimeType: 'text/html'
    };
  }

  async exportVideo(designId, format, settings, canvas) {
    // This would require ffmpeg integration
    // For now, return a mock implementation
    const mockBuffer = Buffer.from('mock-video-data');
    const filename = `design-${designId}.${format}`;
    const filePath = await this.saveFile(filename, mockBuffer);

    return {
      format,
      filename,
      url: this.getFileUrl(filePath),
      size: mockBuffer.length,
      mimeType: 'video/mp4',
      duration: settings.duration || 5000,
      fps: settings.fps || 30
    };
  }

  async exportGIF(designId, settings, canvas) {
    // This would require gif generation library
    // For now, return a mock implementation
    const mockBuffer = Buffer.from('mock-gif-data');
    const filename = `design-${designId}.gif`;
    const filePath = await this.saveFile(filename, mockBuffer);

    return {
      format: 'gif',
      filename,
      url: this.getFileUrl(filePath),
      size: mockBuffer.length,
      mimeType: 'image/gif',
      duration: settings.duration || 5000,
      fps: settings.fps || 10
    };
  }

  generateCanvasHTML(canvas, settings) {
    const objects = canvas.objects || [];
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      width: ${canvas.width}px; 
      height: ${canvas.height}px;
      background: ${canvas.background || '#ffffff'};
      position: relative;
      overflow: hidden;
    }
    .object {
      position: absolute;
    }
    .text {
      font-family: Arial, sans-serif;
      white-space: pre-wrap;
    }
    .shape {
      background-color: var(--fill);
      border: var(--stroke-width) solid var(--stroke);
    }
    .image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  </style>
</head>
<body>
  ${objects.map(obj => this.renderObject(obj)).join('')}
</body>
</html>`;
  }

  renderObject(obj) {
    const style = `
      left: ${obj.left || 0}px;
      top: ${obj.top || 0}px;
      width: ${obj.width || 100}px;
      height: ${obj.height || 100}px;
      transform: rotate(${obj.angle || 0}deg);
      opacity: ${obj.opacity !== undefined ? obj.opacity : 1};
    `;

    switch (obj.type) {
      case 'text':
        return `
          <div class="object text" style="${style}
            color: ${obj.fill || '#000000'};
            font-size: ${obj.fontSize || 16}px;
            font-weight: ${obj.fontWeight || 'normal'};
            text-align: ${obj.textAlign || 'left'};
          ">${obj.text || ''}</div>
        `;
      
      case 'rect':
        return `
          <div class="object shape" style="${style}
            --fill: ${obj.fill || '#000000'};
            --stroke: ${obj.stroke || 'transparent'};
            --stroke-width: ${obj.strokeWidth || 0}px;
            border-radius: ${obj.borderRadius || 0}px;
          "></div>
        `;
      
      case 'circle':
        return `
          <div class="object shape" style="${style}
            --fill: ${obj.fill || '#000000'};
            --stroke: ${obj.stroke || 'transparent'};
            --stroke-width: ${obj.strokeWidth || 0}px;
            border-radius: 50%;
          "></div>
        `;
      
      case 'image':
        return `
          <div class="object" style="${style}">
            <img class="image" src="${obj.src || ''}" alt="">
          </div>
        `;
      
      default:
        return '';
    }
  }

  generateCanvasSVG(canvas, settings) {
    const objects = canvas.objects || [];
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvas.width}" height="${canvas.height}" 
     viewBox="0 0 ${canvas.width} ${canvas.height}"
     xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${canvas.background || '#ffffff'}"/>
  ${objects.map(obj => this.renderSVGObject(obj)).join('')}
</svg>`;
  }

  renderSVGObject(obj) {
    const transform = `translate(${obj.left || 0}, ${obj.top || 0}) rotate(${obj.angle || 0})`;
    const opacity = obj.opacity !== undefined ? obj.opacity : 1;

    switch (obj.type) {
      case 'text':
        return `
          <text transform="${transform}" 
                fill="${obj.fill || '#000000'}"
                font-size="${obj.fontSize || 16}"
                font-weight="${obj.fontWeight || 'normal'}"
                text-anchor="${obj.textAlign || 'start'}"
                opacity="${opacity}">
            ${obj.text || ''}
          </text>
        `;
      
      case 'rect':
        return `
          <rect transform="${transform}"
                width="${obj.width || 100}" 
                height="${obj.height || 100}"
                fill="${obj.fill || '#000000'}"
                stroke="${obj.stroke || 'none'}"
                stroke-width="${obj.strokeWidth || 0}"
                rx="${obj.borderRadius || 0}"
                opacity="${opacity}"/>
        `;
      
      case 'circle':
        const radius = Math.min(obj.width || 100, obj.height || 100) / 2;
        return `
          <circle transform="${transform}"
                  cx="${radius}" 
                  cy="${radius}"
                  r="${radius}"
                  fill="${obj.fill || '#000000'}"
                  stroke="${obj.stroke || 'none'}"
                  stroke-width="${obj.strokeWidth || 0}"
                  opacity="${opacity}"/>
        `;
      
      case 'image':
        return `
          <image transform="${transform}"
                 x="0" y="0"
                 width="${obj.width || 100}" 
                 height="${obj.height || 100}"
                 href="${obj.src || ''}"
                 opacity="${opacity}"/>
        `;
      
      default:
        return '';
    }
  }

  generateHTML5Package(canvas, settings) {
    const hasAnimations = settings.animations && settings.animations.length > 0;
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Design Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f0f0f0;
    }
    #canvas-container {
      width: ${canvas.width}px;
      height: ${canvas.height}px;
      background: ${canvas.background || '#ffffff'};
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .object {
      position: absolute;
      transition: all 0.3s ease;
    }
    ${hasAnimations ? this.generateAnimationCSS(settings.animations) : ''}
  </style>
</head>
<body>
  <div id="canvas-container">
    ${(canvas.objects || []).map(obj => this.renderObject(obj)).join('')}
  </div>
  ${hasAnimations ? this.generateAnimationJS(settings.animations) : ''}
</body>
</html>`;
  }

  generateAnimationCSS(animations) {
    return animations.map((anim, index) => `
    @keyframes animation-${index} {
      ${anim.keyframes.map(kf => `
        ${kf.percentage}% {
          ${Object.entries(kf.properties).map(([prop, value]) => 
            `${this.cssProp(prop)}: ${value};`
          ).join('\n          ')}
        }
      `).join('')}
    }
    `).join('\n');
  }

  generateAnimationJS(animations) {
    return `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const objects = document.querySelectorAll('.object');
        // Apply animations
        ${animations.map(anim => `
          if (objects[${anim.objectIndex}]) {
            objects[${anim.objectIndex}].style.animation = 
              'animation-${anim.index} ${anim.duration}ms ${anim.easing} ${anim.delay}ms ${anim.iterations}';
          }
        `).join('\n')}
      });
    </script>
    `;
  }

  cssProp(prop) {
    const propMap = {
      x: 'transform: translateX',
      y: 'transform: translateY',
      scale: 'transform: scale',
      rotation: 'transform: rotate',
      opacity: 'opacity'
    };
    return propMap[prop] || prop;
  }

  async optimizeImage(buffer, format, settings) {
    const sharpInstance = sharp(buffer);
    
    if (format === 'jpg' || format === 'jpeg') {
      sharpInstance.jpeg({
        quality: settings.quality || 90,
        progressive: true,
        mozjpeg: true
      });
    } else if (format === 'png') {
      sharpInstance.png({
        compressionLevel: 9,
        progressive: true
      });
    }

    // Apply size limit if specified
    if (settings.maxFileSize) {
      let optimized = await sharpInstance.toBuffer();
      let quality = settings.quality || 90;
      
      while (optimized.length > settings.maxFileSize && quality > 10) {
        quality -= 10;
        optimized = await sharp(buffer)
          .jpeg({ quality, progressive: true, mozjpeg: true })
          .toBuffer();
      }
      
      return optimized;
    }

    return await sharpInstance.toBuffer();
  }

  async saveFile(filename, buffer) {
    const uploadDir = path.join(__dirname, '../../uploads/exports');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    
    return filePath;
  }

  getFileUrl(filePath) {
    // In production, this would return a CDN URL
    return `http://localhost:3001/exports/${path.basename(filePath)}`;
  }
}

module.exports = ExportWorker;