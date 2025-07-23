import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface Config {
  app: {
    env: string;
    port: number;
    host: string;
  };
  mongodb: {
    uri: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  upload: {
    dir: string;
    maxFileSize: number;
    allowedImageTypes: string[];
  };
  security: {
    bcryptRounds: number;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
  logging: {
    level: string;
    file: string;
  };
  ai: {
    openai?: string;
    stability?: string;
    replicate?: string;
    removeBg?: string;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
};

export const config: Config = {
  app: {
    env: getEnvVar('NODE_ENV', 'development'),
    port: getEnvNumber('PORT', 3000),
    host: getEnvVar('HOST', 'localhost'),
  },
  mongodb: {
    uri: getEnvVar('MONGODB_URI'),
  },
  redis: {
    url: getEnvVar('REDIS_URL'),
  },
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    expiresIn: getEnvVar('JWT_EXPIRES_IN', '7d'),
    refreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '30d'),
  },
  upload: {
    dir: path.resolve(getEnvVar('UPLOAD_DIR', './uploads')),
    maxFileSize: getEnvNumber('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    allowedImageTypes: getEnvVar(
      'ALLOWED_IMAGE_TYPES',
      'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml'
    ).split(','),
  },
  security: {
    bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
    rateLimit: {
      windowMs: getEnvNumber('RATE_LIMIT_WINDOW', 15) * 60 * 1000, // Convert minutes to ms
      maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    },
  },
  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
    file: getEnvVar('LOG_FILE', './logs/app.log'),
  },
  ai: {
    openai: process.env.OPENAI_API_KEY,
    stability: process.env.STABILITY_API_KEY,
    replicate: process.env.REPLICATE_API_TOKEN,
    removeBg: process.env.REMOVE_BG_API_KEY,
  },
};

// Validate configuration
export const validateConfig = (): void => {
  const requiredVars = [
    'MONGODB_URI',
    'REDIS_URL',
    'JWT_SECRET',
  ];

  const missing = requiredVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate MongoDB URI format
  if (!config.mongodb.uri.startsWith('mongodb://') && !config.mongodb.uri.startsWith('mongodb+srv://')) {
    throw new Error('Invalid MongoDB URI format');
  }

  // Validate Redis URL format
  if (!config.redis.url.startsWith('redis://') && !config.redis.url.startsWith('rediss://')) {
    throw new Error('Invalid Redis URL format');
  }

  // Validate port range
  if (config.app.port < 1 || config.app.port > 65535) {
    throw new Error('Port must be between 1 and 65535');
  }

  console.log(`✅ Configuration validated for ${config.app.env} environment`);
};