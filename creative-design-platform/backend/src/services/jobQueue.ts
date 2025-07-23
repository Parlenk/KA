// Job Queue Service using BullMQ
import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { exportService } from './exportService';
import { aiService } from './aiService';

const prisma = new PrismaClient();

// Redis connection for BullMQ
const redis = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Job queues
export const exportQueue = new Queue('export', { connection: redis });
export const aiQueue = new Queue('ai', { connection: redis });
export const mediaQueue = new Queue('media', { connection: redis });

// Job types
interface ExportJobData {
  designSetId: string;
  canvasIds: string[];
  format: string;
  settings: any;
  userId: string;
}

interface AIJobData {
  type: 'image_generation' | 'background_removal' | 'text_generation' | 'upscaling';
  prompt?: string;
  imageUrl?: string;
  settings: any;
  userId: string;
}

interface MediaJobData {
  type: 'thumbnail' | 'optimization' | 'conversion';
  fileUrl: string;
  settings: any;
  userId: string;
}

// Export worker
const exportWorker = new Worker('export', async (job: Job<ExportJobData>) => {
  const { designSetId, canvasIds, format, settings, userId } = job.data;
  
  try {
    // Update job status in database
    await updateJobStatus(job.id!, 'processing', 0);
    
    // Progress callback
    const onProgress = async (progress: number) => {
      await job.updateProgress(progress);
      await updateJobStatus(job.id!, 'processing', progress);
    };

    let result;
    switch (format) {
      case 'jpg':
      case 'png':
      case 'svg':
        result = await exportService.exportStatic(designSetId, canvasIds, format, settings, onProgress);
        break;
      case 'html5':
        result = await exportService.exportHTML5(designSetId, canvasIds, settings, onProgress);
        break;
      case 'mp4':
      case 'gif':
        result = await exportService.exportVideo(designSetId, canvasIds, format, settings, onProgress);
        break;
      case 'pdf':
        result = await exportService.exportPDF(designSetId, canvasIds, settings, onProgress);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Update job as completed
    await updateJobStatus(job.id!, 'completed', 100, result.downloadUrls);
    
    return result;
  } catch (error) {
    console.error('Export job failed:', error);
    await updateJobStatus(job.id!, 'failed', job.progress, undefined, error.message);
    throw error;
  }
}, { connection: redis });

// AI worker
const aiWorker = new Worker('ai', async (job: Job<AIJobData>) => {
  const { type, prompt, imageUrl, settings, userId } = job.data;
  
  try {
    await updateAIJobStatus(job.id!, 'processing');
    
    let result;
    switch (type) {
      case 'image_generation':
        result = await aiService.generateImage(prompt!, settings);
        break;
      case 'background_removal':
        result = await aiService.removeBackground(imageUrl!, settings);
        break;
      case 'text_generation':
        result = await aiService.generateText(prompt!, settings);
        break;
      case 'upscaling':
        result = await aiService.upscaleImage(imageUrl!, settings);
        break;
      default:
        throw new Error(`Unsupported AI type: ${type}`);
    }

    await updateAIJobStatus(job.id!, 'completed', result.outputUrl);
    
    return result;
  } catch (error) {
    console.error('AI job failed:', error);
    await updateAIJobStatus(job.id!, 'failed', undefined, error.message);
    throw error;
  }
}, { connection: redis });

// Media processing worker
const mediaWorker = new Worker('media', async (job: Job<MediaJobData>) => {
  const { type, fileUrl, settings, userId } = job.data;
  
  try {
    const onProgress = async (progress: number) => {
      await job.updateProgress(progress);
    };

    let result;
    switch (type) {
      case 'thumbnail':
        result = await generateThumbnail(fileUrl, settings, onProgress);
        break;
      case 'optimization':
        result = await optimizeMedia(fileUrl, settings, onProgress);
        break;
      case 'conversion':
        result = await convertMedia(fileUrl, settings, onProgress);
        break;
      default:
        throw new Error(`Unsupported media type: ${type}`);
    }
    
    return result;
  } catch (error) {
    console.error('Media job failed:', error);
    throw error;
  }
}, { connection: redis });

// Job queue functions
export class JobQueueService {
  // Add export job
  static async addExportJob(data: ExportJobData, priority: number = 0): Promise<string> {
    // Create job record in database
    const jobRecord = await prisma.exportJob.create({
      data: {
        status: 'pending',
        format: data.format,
        settings: data.settings,
        userId: data.userId,
        designSetId: data.designSetId,
      },
    });

    // Add to queue
    const job = await exportQueue.add('export', data, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    // Update job record with queue ID
    await prisma.jobQueue.create({
      data: {
        id: jobRecord.id,
        type: 'export',
        data: data,
        status: 'pending',
        priority,
      },
    });

    return jobRecord.id;
  }

  // Add AI job
  static async addAIJob(data: AIJobData, priority: number = 0): Promise<string> {
    const jobRecord = await prisma.aIGeneration.create({
      data: {
        type: data.type,
        prompt: data.prompt,
        settings: data.settings,
        status: 'pending',
        userId: data.userId,
      },
    });

    await aiQueue.add('ai', data, {
      priority,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
    });

    return jobRecord.id;
  }

  // Add media processing job
  static async addMediaJob(data: MediaJobData, priority: number = 0): Promise<string> {
    const job = await mediaQueue.add('media', data, {
      priority,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    });

    return job.id!;
  }

  // Get job status
  static async getJobStatus(jobId: string): Promise<any> {
    const exportJob = await prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (exportJob) return exportJob;

    const aiJob = await prisma.aIGeneration.findUnique({
      where: { id: jobId },
    });

    return aiJob;
  }

  // Cancel job
  static async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await exportQueue.getJob(jobId);
      if (job) {
        await job.remove();
        await updateJobStatus(jobId, 'failed', 0, undefined, 'Cancelled by user');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error cancelling job:', error);
      return false;
    }
  }

  // Get queue statistics
  static async getQueueStats() {
    const [exportStats, aiStats, mediaStats] = await Promise.all([
      exportQueue.getJobCounts(),
      aiQueue.getJobCounts(),
      mediaQueue.getJobCounts(),
    ]);

    return {
      export: exportStats,
      ai: aiStats,
      media: mediaStats,
    };
  }

  // Retry failed job
  static async retryJob(jobId: string): Promise<boolean> {
    try {
      const job = await exportQueue.getJob(jobId);
      if (job && job.failedReason) {
        await job.retry();
        await updateJobStatus(jobId, 'pending', 0);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error retrying job:', error);
      return false;
    }
  }

  // Clean up old jobs
  static async cleanupOldJobs(olderThanDays: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    await Promise.all([
      exportQueue.clean(olderThanDays * 24 * 60 * 60 * 1000, 10, 'completed'),
      exportQueue.clean(olderThanDays * 24 * 60 * 60 * 1000, 10, 'failed'),
      aiQueue.clean(olderThanDays * 24 * 60 * 60 * 1000, 10, 'completed'),
      aiQueue.clean(olderThanDays * 24 * 60 * 60 * 1000, 10, 'failed'),
    ]);

    // Clean up database records
    await prisma.exportJob.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: ['completed', 'failed'],
        },
      },
    });
  }
}

// Helper functions
async function updateJobStatus(
  jobId: string, 
  status: string, 
  progress: number, 
  downloadUrls?: string[], 
  error?: string
): Promise<void> {
  await prisma.exportJob.update({
    where: { id: jobId },
    data: {
      status,
      progress,
      downloadUrls: downloadUrls || undefined,
      error,
      completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
    },
  });
}

async function updateAIJobStatus(
  jobId: string, 
  status: string, 
  outputUrl?: string, 
  error?: string
): Promise<void> {
  await prisma.aIGeneration.update({
    where: { id: jobId },
    data: {
      status,
      outputUrl,
      error,
      completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
    },
  });
}

// Placeholder functions for media processing
async function generateThumbnail(fileUrl: string, settings: any, onProgress: (progress: number) => Promise<void>) {
  // Implementation would use Sharp for image thumbnails
  // or ffmpeg for video thumbnails
  onProgress(50);
  // ... processing logic
  onProgress(100);
  return { thumbnailUrl: 'generated-thumbnail-url' };
}

async function optimizeMedia(fileUrl: string, settings: any, onProgress: (progress: number) => Promise<void>) {
  // Implementation would optimize file size while maintaining quality
  onProgress(100);
  return { optimizedUrl: 'optimized-file-url' };
}

async function convertMedia(fileUrl: string, settings: any, onProgress: (progress: number) => Promise<void>) {
  // Implementation would convert between different formats
  onProgress(100);
  return { convertedUrl: 'converted-file-url' };
}

// Event handlers
exportWorker.on('completed', (job) => {
  console.log(`Export job ${job.id} completed`);
});

exportWorker.on('failed', (job, err) => {
  console.error(`Export job ${job?.id} failed:`, err);
});

aiWorker.on('completed', (job) => {
  console.log(`AI job ${job.id} completed`);
});

aiWorker.on('failed', (job, err) => {
  console.error(`AI job ${job?.id} failed:`, err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await exportWorker.close();
  await aiWorker.close();
  await mediaWorker.close();
  await redis.disconnect();
});

export { exportWorker, aiWorker, mediaWorker };