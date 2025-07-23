// Animation management controller
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createAnimationSchema = z.object({
  canvasId: z.string(),
  objectId: z.string(),
  name: z.string().optional(),
  duration: z.number().positive().max(300000), // Max 5 minutes
  delay: z.number().min(0).default(0),
  loop: z.boolean().default(false),
  easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'bounce', 'elastic']).default('ease-in-out'),
  keyframes: z.array(z.object({
    time: z.number().min(0),
    properties: z.record(z.any()),
    easing: z.string().optional(),
  })),
});

const updateAnimationSchema = z.object({
  name: z.string().optional(),
  duration: z.number().positive().max(300000).optional(),
  delay: z.number().min(0).optional(),
  loop: z.boolean().optional(),
  easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'bounce', 'elastic']).optional(),
  keyframes: z.array(z.object({
    time: z.number().min(0),
    properties: z.record(z.any()),
    easing: z.string().optional(),
  })).optional(),
});

const applyPresetSchema = z.object({
  canvasId: z.string(),
  objectIds: z.array(z.string()),
  preset: z.object({
    name: z.string(),
    keyframes: z.array(z.object({
      time: z.number().min(0),
      properties: z.record(z.any()),
      easing: z.string().optional(),
    })),
  }),
  startTime: z.number().min(0).default(0),
  stagger: z.number().min(0).default(0), // Delay between objects
});

const magicAnimatorSchema = z.object({
  canvasId: z.string(),
  objectIds: z.array(z.string()),
  style: z.enum(['elegant', 'playful', 'professional', 'dynamic', 'minimal']),
  duration: z.number().positive().max(300000).default(3000),
  intensity: z.enum(['subtle', 'moderate', 'dramatic']).default('moderate'),
});

export class AnimationController {
  // Create animation for an object
  static async create(req: Request, res: Response) {
    try {
      const animationData = createAnimationSchema.parse(req.body);
      const userId = req.user.id;

      // Verify canvas ownership
      const canvas = await prisma.canvas.findFirst({
        where: {
          id: animationData.canvasId,
          designSet: {
            project: { userId },
          },
        },
      });

      if (!canvas) {
        return res.status(404).json({ error: 'Canvas not found' });
      }

      // Verify object exists
      const object = await prisma.canvasObject.findFirst({
        where: {
          id: animationData.objectId,
          canvasId: animationData.canvasId,
        },
      });

      if (!object) {
        return res.status(404).json({ error: 'Object not found' });
      }

      // Create animation
      const animation = await prisma.animation.create({
        data: {
          ...animationData,
          keyframes: animationData.keyframes,
        },
      });

      res.status(201).json(animation);
    } catch (error) {
      console.error('Error creating animation:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get animations for a canvas or specific object
  static async getByCanvas(req: Request, res: Response) {
    try {
      const { canvasId } = req.params;
      const { objectId } = req.query;
      const userId = req.user.id;

      // Verify canvas ownership
      const canvas = await prisma.canvas.findFirst({
        where: {
          id: canvasId,
          designSet: {
            project: { userId },
          },
        },
      });

      if (!canvas) {
        return res.status(404).json({ error: 'Canvas not found' });
      }

      const where: any = { canvasId };
      if (objectId) where.objectId = objectId;

      const animations = await prisma.animation.findMany({
        where,
        include: {
          object: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json(animations);
    } catch (error) {
      console.error('Error fetching animations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update animation
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = updateAnimationSchema.parse(req.body);
      const userId = req.user.id;

      // Verify ownership
      const animation = await prisma.animation.findFirst({
        where: {
          id,
          canvas: {
            designSet: {
              project: { userId },
            },
          },
        },
      });

      if (!animation) {
        return res.status(404).json({ error: 'Animation not found' });
      }

      const updatedAnimation = await prisma.animation.update({
        where: { id },
        data: updates,
        include: {
          object: true,
        },
      });

      res.json(updatedAnimation);
    } catch (error) {
      console.error('Error updating animation:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete animation
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const animation = await prisma.animation.findFirst({
        where: {
          id,
          canvas: {
            designSet: {
              project: { userId },
            },
          },
        },
      });

      if (!animation) {
        return res.status(404).json({ error: 'Animation not found' });
      }

      await prisma.animation.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting animation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Apply animation preset to multiple objects
  static async applyPreset(req: Request, res: Response) {
    try {
      const { canvasId, objectIds, preset, startTime, stagger } = applyPresetSchema.parse(req.body);
      const userId = req.user.id;

      // Verify canvas ownership
      const canvas = await prisma.canvas.findFirst({
        where: {
          id: canvasId,
          designSet: {
            project: { userId },
          },
        },
      });

      if (!canvas) {
        return res.status(404).json({ error: 'Canvas not found' });
      }

      // Create animations for each object
      const animations = [];
      for (let i = 0; i < objectIds.length; i++) {
        const objectId = objectIds[i];
        const objectStartTime = startTime + (i * stagger);

        // Adjust keyframe times based on start time
        const adjustedKeyframes = preset.keyframes.map(kf => ({
          ...kf,
          time: kf.time + objectStartTime,
        }));

        const animation = await prisma.animation.create({
          data: {
            canvasId,
            objectId,
            name: `${preset.name} - Object ${i + 1}`,
            duration: Math.max(...preset.keyframes.map(kf => kf.time)) + objectStartTime,
            keyframes: adjustedKeyframes,
          },
          include: {
            object: true,
          },
        });

        animations.push(animation);
      }

      res.status(201).json(animations);
    } catch (error) {
      console.error('Error applying preset:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Magic Animator - AI-powered animation generation
  static async magicAnimator(req: Request, res: Response) {
    try {
      const { canvasId, objectIds, style, duration, intensity } = magicAnimatorSchema.parse(req.body);
      const userId = req.user.id;

      // Verify canvas ownership
      const canvas = await prisma.canvas.findFirst({
        where: {
          id: canvasId,
          designSet: {
            project: { userId },
          },
        },
        include: {
          objects: {
            where: {
              id: { in: objectIds },
            },
          },
        },
      });

      if (!canvas) {
        return res.status(404).json({ error: 'Canvas not found' });
      }

      if (canvas.objects.length !== objectIds.length) {
        return res.status(400).json({ error: 'Some objects not found' });
      }

      // Generate intelligent animations based on object types and positions
      const animations = [];
      
      for (let i = 0; i < canvas.objects.length; i++) {
        const object = canvas.objects[i];
        const objectProps = object.properties as any;
        
        // Generate keyframes based on style and object type
        const keyframes = generateMagicKeyframes(object, style, duration, intensity, i);
        
        const animation = await prisma.animation.create({
          data: {
            canvasId,
            objectId: object.id,
            name: `Magic ${style} - ${object.type}`,
            duration,
            keyframes,
            loop: false,
          },
          include: {
            object: true,
          },
        });

        animations.push(animation);
      }

      res.status(201).json(animations);
    } catch (error) {
      console.error('Error generating magic animation:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Copy animation from one object to another
  static async copyAnimation(req: Request, res: Response) {
    try {
      const { sourceId, targetObjectIds } = req.body;
      const userId = req.user.id;

      // Get source animation
      const sourceAnimation = await prisma.animation.findFirst({
        where: {
          id: sourceId,
          canvas: {
            designSet: {
              project: { userId },
            },
          },
        },
      });

      if (!sourceAnimation) {
        return res.status(404).json({ error: 'Source animation not found' });
      }

      // Create copies for target objects
      const copiedAnimations = [];
      for (const targetObjectId of targetObjectIds) {
        const copiedAnimation = await prisma.animation.create({
          data: {
            canvasId: sourceAnimation.canvasId,
            objectId: targetObjectId,
            name: `${sourceAnimation.name} (Copy)`,
            duration: sourceAnimation.duration,
            delay: sourceAnimation.delay,
            loop: sourceAnimation.loop,
            easing: sourceAnimation.easing,
            keyframes: sourceAnimation.keyframes,
          },
          include: {
            object: true,
          },
        });

        copiedAnimations.push(copiedAnimation);
      }

      res.status(201).json(copiedAnimations);
    } catch (error) {
      console.error('Error copying animation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get animation presets
  static async getPresets(req: Request, res: Response) {
    try {
      const presets = {
        ENTRY: [
          {
            name: 'Fade In',
            duration: 500,
            keyframes: [
              { time: 0, properties: { opacity: 0 } },
              { time: 500, properties: { opacity: 1 } }
            ]
          },
          {
            name: 'Slide In Left',
            duration: 500,
            keyframes: [
              { time: 0, properties: { x: -100, opacity: 0 } },
              { time: 500, properties: { x: 0, opacity: 1 } }
            ]
          },
          {
            name: 'Zoom In',
            duration: 500,
            keyframes: [
              { time: 0, properties: { scaleX: 0, scaleY: 0, opacity: 0 } },
              { time: 500, properties: { scaleX: 1, scaleY: 1, opacity: 1 } }
            ]
          },
        ],
        EXIT: [
          {
            name: 'Fade Out',
            duration: 500,
            keyframes: [
              { time: 0, properties: { opacity: 1 } },
              { time: 500, properties: { opacity: 0 } }
            ]
          },
          {
            name: 'Slide Out Right',
            duration: 500,
            keyframes: [
              { time: 0, properties: { x: 0, opacity: 1 } },
              { time: 500, properties: { x: 100, opacity: 0 } }
            ]
          },
        ],
        EMPHASIS: [
          {
            name: 'Pulse',
            duration: 1000,
            keyframes: [
              { time: 0, properties: { scaleX: 1, scaleY: 1 } },
              { time: 500, properties: { scaleX: 1.1, scaleY: 1.1 } },
              { time: 1000, properties: { scaleX: 1, scaleY: 1 } }
            ]
          },
          {
            name: 'Shake',
            duration: 600,
            keyframes: [
              { time: 0, properties: { x: 0 } },
              { time: 100, properties: { x: -5 } },
              { time: 200, properties: { x: 5 } },
              { time: 300, properties: { x: -5 } },
              { time: 400, properties: { x: 5 } },
              { time: 500, properties: { x: -5 } },
              { time: 600, properties: { x: 0 } }
            ]
          },
        ],
      };

      res.json(presets);
    } catch (error) {
      console.error('Error fetching presets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Helper function to generate magic keyframes
function generateMagicKeyframes(object: any, style: string, duration: number, intensity: string, index: number) {
  const props = object.properties;
  const baseDelay = index * 200; // Stagger animations
  
  const intensityMultipliers = {
    subtle: 0.5,
    moderate: 1.0,
    dramatic: 1.5,
  };
  
  const multiplier = intensityMultipliers[intensity as keyof typeof intensityMultipliers];
  
  switch (style) {
    case 'elegant':
      return [
        { time: baseDelay, properties: { opacity: 0, y: props.y + (20 * multiplier) } },
        { time: baseDelay + duration * 0.7, properties: { opacity: 1, y: props.y } },
        { time: baseDelay + duration, properties: { opacity: 1, y: props.y } },
      ];
      
    case 'playful':
      return [
        { time: baseDelay, properties: { opacity: 0, scaleX: 0.3, scaleY: 0.3, rotation: -15 * multiplier } },
        { time: baseDelay + duration * 0.6, properties: { opacity: 1, scaleX: 1.1, scaleY: 1.1, rotation: 5 * multiplier } },
        { time: baseDelay + duration, properties: { opacity: 1, scaleX: 1, scaleY: 1, rotation: 0 } },
      ];
      
    case 'professional':
      return [
        { time: baseDelay, properties: { opacity: 0, x: props.x - (30 * multiplier) } },
        { time: baseDelay + duration, properties: { opacity: 1, x: props.x } },
      ];
      
    case 'dynamic':
      return [
        { time: baseDelay, properties: { opacity: 0, scaleX: 1.5 * multiplier, scaleY: 1.5 * multiplier, rotation: 360 * multiplier } },
        { time: baseDelay + duration * 0.8, properties: { opacity: 1, scaleX: 1, scaleY: 1, rotation: 0 } },
      ];
      
    case 'minimal':
      return [
        { time: baseDelay, properties: { opacity: 0 } },
        { time: baseDelay + duration, properties: { opacity: 1 } },
      ];
      
    default:
      return [
        { time: baseDelay, properties: { opacity: 0 } },
        { time: baseDelay + duration, properties: { opacity: 1 } },
      ];
  }
}