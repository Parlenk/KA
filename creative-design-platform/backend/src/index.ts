import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config, validateConfig } from './config/environment';
import { DatabaseConnection } from './config/database';
import apiRoutes from './routes';

class Server {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.app.port;
    
    this.validateEnvironment();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private validateEnvironment(): void {
    try {
      validateConfig();
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      process.exit(1);
    }
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.app.env === 'development' 
        ? ['http://localhost:3000', 'http://localhost:5173'] 
        : [],
      credentials: true,
      optionsSuccessStatus: 200,
    }));

    // Compression
    this.app.use(compression());

    // Logging
    if (config.app.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.app.env,
        version: '1.0.0',
      });
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1', apiRoutes);

    // Legacy API endpoint for backward compatibility
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        message: 'Creative Design Platform API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          api: '/api/v1',
          auth: '/api/v1/auth',
        },
      });
    });

    // 404 handler for unknown routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
      });
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((
      error: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      console.error('❌ Unhandled error:', error);

      const statusCode = (error as any).statusCode || 500;
      const message = config.app.env === 'development' 
        ? error.message 
        : 'Internal server error';

      res.status(statusCode).json({
        error: true,
        message,
        ...(config.app.env === 'development' && { stack: error.stack }),
      });
    });
  }

  private async initializeDatabases(): Promise<void> {
    try {
      await DatabaseConnection.connectAll();
      console.log('✅ All databases connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      // Connect to databases
      await this.initializeDatabases();

      // Start the server
      this.app.listen(this.port, config.app.host, () => {
        console.log('🚀 Server started successfully!');
        console.log(`📍 URL: http://${config.app.host}:${this.port}`);
        console.log(`🌍 Environment: ${config.app.env}`);
        console.log(`⏰ Started at: ${new Date().toISOString()}`);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        await DatabaseConnection.disconnectAll();
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }
}

// Start the server
const server = new Server();
server.start().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});