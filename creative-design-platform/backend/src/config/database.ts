import mongoose from 'mongoose';
import Redis from 'ioredis';
import { config } from './environment';

export class DatabaseConnection {
  private static mongoConnection: typeof mongoose | null = null;
  private static redisConnection: Redis | null = null;

  static async connectMongoDB(): Promise<typeof mongoose> {
    if (this.mongoConnection) {
      return this.mongoConnection;
    }

    try {
      console.log('🔄 Connecting to MongoDB...');
      
      const connection = await mongoose.connect(config.mongodb.uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });

      this.mongoConnection = connection;
      
      console.log('✅ MongoDB connected successfully');
      console.log(`📍 Database: ${connection.connection.name}`);
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('🔌 MongoDB disconnected');
        this.mongoConnection = null;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      return connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  static async connectRedis(): Promise<Redis> {
    if (this.redisConnection && this.redisConnection.status === 'ready') {
      return this.redisConnection;
    }

    try {
      console.log('🔄 Connecting to Redis...');
      
      const redis = new Redis(config.redis.url, {
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error);
      });

      redis.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.redisConnection = null;
      });

      redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      // Test the connection
      await redis.ping();
      
      this.redisConnection = redis;
      return redis;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  static async connectAll(): Promise<{ mongo: typeof mongoose; redis: Redis }> {
    const [mongo, redis] = await Promise.all([
      this.connectMongoDB(),
      this.connectRedis(),
    ]);

    return { mongo, redis };
  }

  static async disconnectAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.mongoConnection) {
      promises.push(mongoose.disconnect());
    }

    if (this.redisConnection) {
      promises.push(new Promise<void>((resolve) => {
        this.redisConnection!.disconnect();
        resolve();
      }));
    }

    await Promise.all(promises);
    
    this.mongoConnection = null;
    this.redisConnection = null;
    
    console.log('🔌 All database connections closed');
  }

  static getRedis(): Redis | null {
    return this.redisConnection;
  }

  static getMongo(): typeof mongoose | null {
    return this.mongoConnection;
  }
}