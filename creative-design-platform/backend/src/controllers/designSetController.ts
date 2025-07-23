// Design Set management controller
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createDesignSetSchema = z.object({
  name: z.string().min(1).max(100),
  projectId: z.string(),
  sizes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    width: z.number().positive(),
    height: z.number().positive(),
    category: z.enum(['social', 'display', 'print', 'video', 'custom']),
    platform: z.string().optional(),
  })),
});

const updateDesignSetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  syncColors: z.boolean().optional(),
  syncFonts: z.boolean().optional(),
  syncLayout: z.boolean().optional(),
  syncAnimations: z.boolean().optional(),
  masterCanvasId: z.string().optional(),
});

const syncChangesSchema = z.object({
  sourceCanvasId: z.string(),
  changes: z.object({
    type: z.enum(['object_added', 'object_updated', 'object_deleted', 'background_changed']),
    objectId: z.string().optional(),
    properties: z.record(z.any()).optional(),
  }),
});

export class DesignSetController {
  // Create new design set with multiple canvas sizes
  static async create(req: Request, res: Response) {
    try {
      const { name, projectId, sizes } = createDesignSetSchema.parse(req.body);
      const userId = req.user.id;

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Create design set with canvases for each size
      const designSet = await prisma.designSet.create({
        data: {
          name,
          projectId,
          canvases: {
            create: sizes.map((size, index) => ({
              name: size.name,
              width: size.width,
              height: size.height,
              sizeId: size.id,
              platform: size.platform,
              metadata: {
                category: size.category,
                isOriginal: index === 0, // First size is the master
              },
            })),
          },
        },
        include: {
          canvases: {
            include: {
              objects: true,
              animations: true,
            },
          },
        },
      });

      // Set master canvas as the first one
      if (designSet.canvases.length > 0) {
        await prisma.designSet.update({
          where: { id: designSet.id },
          data: { masterCanvasId: designSet.canvases[0].id },
        });
      }

      res.status(201).json(designSet);
    } catch (error) {
      console.error('Error creating design set:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get design set with all canvases
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const designSet = await prisma.designSet.findFirst({
        where: {
          id,
          project: { userId },
        },
        include: {
          project: true,
          canvases: {
            include: {
              objects: {
                orderBy: { layerIndex: 'asc' },
              },
              animations: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!designSet) {
        return res.status(404).json({ error: 'Design set not found' });
      }

      res.json(designSet);
    } catch (error) {
      console.error('Error fetching design set:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update design set properties
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = updateDesignSetSchema.parse(req.body);
      const userId = req.user.id;

      // Verify ownership
      const designSet = await prisma.designSet.findFirst({
        where: {
          id,
          project: { userId },
        },
      });

      if (!designSet) {
        return res.status(404).json({ error: 'Design set not found' });
      }

      const updatedDesignSet = await prisma.designSet.update({
        where: { id },
        data: updates,
        include: {
          canvases: {
            include: {
              objects: true,
              animations: true,
            },
          },
        },
      });

      res.json(updatedDesignSet);
    } catch (error) {
      console.error('Error updating design set:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Sync changes across all canvases in a design set
  static async syncChanges(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { sourceCanvasId, changes } = syncChangesSchema.parse(req.body);
      const userId = req.user.id;

      // Get design set with sync settings
      const designSet = await prisma.designSet.findFirst({
        where: {
          id,
          project: { userId },
        },
        include: {
          canvases: true,
        },
      });

      if (!designSet) {
        return res.status(404).json({ error: 'Design set not found' });
      }

      // Get source canvas
      const sourceCanvas = designSet.canvases.find(c => c.id === sourceCanvasId);
      if (!sourceCanvas) {
        return res.status(404).json({ error: 'Source canvas not found' });
      }

      // Apply changes to other canvases based on sync settings
      const targetCanvases = designSet.canvases.filter(c => c.id !== sourceCanvasId);
      const syncPromises = [];

      for (const targetCanvas of targetCanvases) {
        if (changes.type === 'background_changed' && designSet.syncColors) {
          // Sync background changes
          syncPromises.push(
            prisma.canvas.update({
              where: { id: targetCanvas.id },
              data: {
                backgroundColor: sourceCanvas.backgroundColor,
                backgroundType: sourceCanvas.backgroundType,
                backgroundValue: sourceCanvas.backgroundValue,
                backgroundOpacity: sourceCanvas.backgroundOpacity,
              },
            })
          );
        }

        if (changes.type === 'object_added' && changes.properties) {
          // Scale object properties for different canvas sizes
          const scaleX = targetCanvas.width / sourceCanvas.width;
          const scaleY = targetCanvas.height / sourceCanvas.height;
          
          const scaledProperties = {
            ...changes.properties,
            x: changes.properties.x * scaleX,
            y: changes.properties.y * scaleY,
            width: changes.properties.width * scaleX,
            height: changes.properties.height * scaleY,
          };

          syncPromises.push(
            prisma.canvasObject.create({
              data: {
                type: changes.properties.type,
                canvasId: targetCanvas.id,
                properties: scaledProperties,
                layerIndex: changes.properties.layerIndex || 0,
              },
            })
          );
        }

        if (changes.type === 'object_updated' && changes.objectId && changes.properties) {
          // Find corresponding object in target canvas and update
          const targetObject = await prisma.canvasObject.findFirst({
            where: {
              canvasId: targetCanvas.id,
              // You might need a better way to match objects across canvases
              // For now, we'll use the creation time or a custom ID mapping
            },
          });

          if (targetObject) {
            const scaleX = targetCanvas.width / sourceCanvas.width;
            const scaleY = targetCanvas.height / sourceCanvas.height;
            
            const scaledProperties = {
              ...changes.properties,
              x: changes.properties.x * scaleX,
              y: changes.properties.y * scaleY,
              width: changes.properties.width * scaleX,
              height: changes.properties.height * scaleY,
            };

            syncPromises.push(
              prisma.canvasObject.update({
                where: { id: targetObject.id },
                data: { properties: scaledProperties },
              })
            );
          }
        }
      }

      await Promise.all(syncPromises);

      // Return updated design set
      const updatedDesignSet = await prisma.designSet.findUnique({
        where: { id },
        include: {
          canvases: {
            include: {
              objects: true,
              animations: true,
            },
          },
        },
      });

      res.json(updatedDesignSet);
    } catch (error) {
      console.error('Error syncing changes:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Add new canvas size to existing design set
  static async addCanvasSize(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { size } = req.body;
      const userId = req.user.id;

      // Verify ownership
      const designSet = await prisma.designSet.findFirst({
        where: {
          id,
          project: { userId },
        },
      });

      if (!designSet) {
        return res.status(404).json({ error: 'Design set not found' });
      }

      // Create new canvas
      const newCanvas = await prisma.canvas.create({
        data: {
          name: size.name,
          width: size.width,
          height: size.height,
          sizeId: size.id,
          platform: size.platform,
          designSetId: id,
          metadata: {
            category: size.category,
          },
        },
        include: {
          objects: true,
          animations: true,
        },
      });

      res.status(201).json(newCanvas);
    } catch (error) {
      console.error('Error adding canvas size:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Remove canvas from design set
  static async removeCanvas(req: Request, res: Response) {
    try {
      const { id, canvasId } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const designSet = await prisma.designSet.findFirst({
        where: {
          id,
          project: { userId },
        },
        include: {
          canvases: true,
        },
      });

      if (!designSet) {
        return res.status(404).json({ error: 'Design set not found' });
      }

      // Don't allow removing the last canvas
      if (designSet.canvases.length <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last canvas' });
      }

      // Remove canvas
      await prisma.canvas.delete({
        where: { id: canvasId },
      });

      // Update master canvas if it was the one removed
      if (designSet.masterCanvasId === canvasId) {
        const remainingCanvas = designSet.canvases.find(c => c.id !== canvasId);
        if (remainingCanvas) {
          await prisma.designSet.update({
            where: { id },
            data: { masterCanvasId: remainingCanvas.id },
          });
        }
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error removing canvas:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete design set
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const designSet = await prisma.designSet.findFirst({
        where: {
          id,
          project: { userId },
        },
      });

      if (!designSet) {
        return res.status(404).json({ error: 'Design set not found' });
      }

      await prisma.designSet.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting design set:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get standard ad sizes
  static async getStandardSizes(req: Request, res: Response) {
    try {
      const { category, platform } = req.query;

      const where: any = {};
      if (category) where.category = category;
      if (platform) where.platform = platform;

      const sizes = await prisma.adSize.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { platform: 'asc' },
          { name: 'asc' },
        ],
      });

      res.json(sizes);
    } catch (error) {
      console.error('Error fetching standard sizes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}