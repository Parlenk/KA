-- Add webhook-related tables to the database schema

-- API Keys table for authentication
CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS "Webhook" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "description" TEXT,
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- Webhook deliveries table for tracking delivery attempts
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusCode" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "responseHeaders" JSONB,
    "responseBody" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- API calls table for analytics
CREATE TABLE IF NOT EXISTS "ApiCall" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "apiKeyId" TEXT,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "statusCode" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "requestSize" INTEGER NOT NULL DEFAULT 0,
    "responseSize" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiCall_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE INDEX IF NOT EXISTS "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");
CREATE INDEX IF NOT EXISTS "ApiKey_isActive_idx" ON "ApiKey"("isActive");

CREATE INDEX IF NOT EXISTS "Webhook_userId_idx" ON "Webhook"("userId");
CREATE INDEX IF NOT EXISTS "Webhook_isActive_idx" ON "Webhook"("isActive");

CREATE INDEX IF NOT EXISTS "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

CREATE INDEX IF NOT EXISTS "ApiCall_userId_idx" ON "ApiCall"("userId");
CREATE INDEX IF NOT EXISTS "ApiCall_apiKeyId_idx" ON "ApiCall"("apiKeyId");
CREATE INDEX IF NOT EXISTS "ApiCall_timestamp_idx" ON "ApiCall"("timestamp");
CREATE INDEX IF NOT EXISTS "ApiCall_endpoint_idx" ON "ApiCall"("endpoint");

-- Add foreign key constraints
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiCall" ADD CONSTRAINT "ApiCall_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiCall" ADD CONSTRAINT "ApiCall_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique constraints
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_keyPrefix_key" UNIQUE ("keyPrefix");

-- Add check constraints
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_status_check" CHECK ("status" IN ('pending', 'success', 'failed'));
ALTER TABLE "ApiCall" ADD CONSTRAINT "ApiCall_method_check" CHECK ("method" IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'));

-- Add comments for documentation
COMMENT ON TABLE "ApiKey" IS 'API keys for external integrations and authentication';
COMMENT ON TABLE "Webhook" IS 'Webhook configurations for event notifications';
COMMENT ON TABLE "WebhookDelivery" IS 'Webhook delivery attempts and their status';
COMMENT ON TABLE "ApiCall" IS 'API call logs for analytics and monitoring';

COMMENT ON COLUMN "ApiKey"."keyPrefix" IS 'First part of the API key for identification';
COMMENT ON COLUMN "ApiKey"."keyHash" IS 'Hashed secret part of the API key';
COMMENT ON COLUMN "ApiKey"."scopes" IS 'Permissions granted to this API key';

COMMENT ON COLUMN "Webhook"."events" IS 'List of events this webhook subscribes to';
COMMENT ON COLUMN "Webhook"."secret" IS 'Secret key for webhook signature verification';

COMMENT ON COLUMN "WebhookDelivery"."payload" IS 'Event data sent to the webhook';
COMMENT ON COLUMN "WebhookDelivery"."attempts" IS 'Number of delivery attempts made';

COMMENT ON COLUMN "ApiCall"."duration" IS 'Request processing time in milliseconds';
COMMENT ON COLUMN "ApiCall"."requestSize" IS 'Size of request body in bytes';
COMMENT ON COLUMN "ApiCall"."responseSize" IS 'Size of response body in bytes';