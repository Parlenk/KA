# Production Deployment Guide

## Table of Contents
- [Overview](#overview)
- [Infrastructure Requirements](#infrastructure-requirements)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Application Deployment](#application-deployment)
- [Load Balancing](#load-balancing)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Configuration](#security-configuration)
- [Backup and Disaster Recovery](#backup-and-disaster-recovery)
- [Performance Optimization](#performance-optimization)
- [Scaling Strategies](#scaling-strategies)
- [Troubleshooting](#troubleshooting)

## Overview

This guide covers the production deployment of the Creative Design Platform, including infrastructure setup, security configurations, monitoring, and scaling strategies.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Application   │    │    Database     │
│     (NGINX)     │────│    Servers      │────│   PostgreSQL    │
│                 │    │   (Node.js)     │    │     Cluster     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Cache       │    │  File Storage   │
                       │     (Redis)     │    │     (S3)        │
                       └─────────────────┘    └─────────────────┘
```

### Technology Stack

- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Document Store**: MongoDB 6+
- **File Storage**: AWS S3 / MinIO
- **Queue**: BullMQ (Redis-based)
- **Load Balancer**: NGINX
- **Process Manager**: PM2
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + ELK Stack

## Infrastructure Requirements

### Minimum Production Environment

#### Application Servers (2x)
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Network**: 1Gbps
- **OS**: Ubuntu 22.04 LTS

#### Database Server
- **CPU**: 8 cores
- **RAM**: 16GB
- **Storage**: 200GB SSD (with backup)
- **Network**: 1Gbps
- **IOPS**: 3000+

#### Cache Server
- **CPU**: 2 cores
- **RAM**: 8GB
- **Storage**: 20GB SSD
- **Network**: 1Gbps

#### Load Balancer
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: 1Gbps

### Recommended Production Environment

#### Application Servers (3x)
- **CPU**: 8 cores
- **RAM**: 16GB
- **Storage**: 100GB SSD
- **Network**: 10Gbps

#### Database Cluster (Primary + 2 Replicas)
- **CPU**: 16 cores
- **RAM**: 32GB
- **Storage**: 500GB NVMe SSD
- **Network**: 10Gbps
- **IOPS**: 10000+

#### Cache Cluster (3x)
- **CPU**: 4 cores
- **RAM**: 16GB
- **Storage**: 50GB SSD
- **Network**: 10Gbps

#### CDN and File Storage
- **AWS CloudFront** or equivalent CDN
- **AWS S3** with cross-region replication
- **Backup Storage**: AWS Glacier

## Environment Setup

### Server Preparation

#### Update System
```bash
# Update package lists and upgrade system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget gnupg2 software-properties-common \
    apt-transport-https ca-certificates build-essential

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x or higher
```

#### Install PM2 Process Manager
```bash
# Install PM2 globally
sudo npm install -g pm2

# Configure PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Save PM2 configuration
pm2 save
```

#### Configure Firewall
```bash
# Install and configure UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port (internal)
sudo ufw allow 3000/tcp

# Check status
sudo ufw status
```

### SSL Certificate Setup

#### Using Let's Encrypt (Certbot)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Test certificate renewal
sudo certbot renew --dry-run

# Setup automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Custom Certificate
```bash
# Create SSL directory
sudo mkdir -p /etc/ssl/private /etc/ssl/certs

# Copy certificate files
sudo cp your-domain.crt /etc/ssl/certs/
sudo cp your-domain.key /etc/ssl/private/
sudo cp ca-bundle.crt /etc/ssl/certs/

# Set permissions
sudo chmod 600 /etc/ssl/private/your-domain.key
sudo chmod 644 /etc/ssl/certs/your-domain.crt
```

## Database Setup

### PostgreSQL Installation and Configuration

#### Install PostgreSQL
```bash
# Add PostgreSQL repository
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# Update and install
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Configure PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

-- Create database and user
CREATE DATABASE creative_platform_production;
CREATE USER creative_platform WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE creative_platform_production TO creative_platform;

-- Configure permissions
\c creative_platform_production
GRANT ALL ON SCHEMA public TO creative_platform;

-- Exit PostgreSQL
\q
```

#### Optimize PostgreSQL Configuration
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/15/main/postgresql.conf
```

```ini
# Memory settings
shared_buffers = 4GB                    # 25% of total RAM
effective_cache_size = 12GB             # 75% of total RAM
work_mem = 256MB                        # For complex queries
maintenance_work_mem = 1GB              # For maintenance operations

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements'

# Checkpoint settings
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
wal_buffers = 64MB

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_duration_statement = 1000       # Log slow queries
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

#### Configure Connection Security
```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

```ini
# Add application server IPs
host    creative_platform_production    creative_platform    10.0.1.10/32    md5
host    creative_platform_production    creative_platform    10.0.1.11/32    md5
host    creative_platform_production    creative_platform    10.0.1.12/32    md5

# Restrict other connections
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

### Redis Installation and Configuration

#### Install Redis
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

```ini
# Bind to specific interface
bind 127.0.0.1 10.0.1.20

# Set password
requirepass your_redis_password_here

# Memory optimization
maxmemory 6gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

#### Start and Enable Redis
```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping
```

### MongoDB Setup

#### Install MongoDB
```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Configure MongoDB
```bash
# Edit MongoDB configuration
sudo nano /etc/mongod.conf
```

```yaml
# mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1,10.0.1.30

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

security:
  authorization: enabled

replication:
  replSetName: "rs0"
```

#### Create MongoDB Admin User
```bash
# Connect to MongoDB
mongosh

// Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "secure_admin_password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

// Create application user
use creative_platform_production
db.createUser({
  user: "creative_platform",
  pwd: "secure_app_password",
  roles: ["readWrite"]
})

// Exit MongoDB
exit
```

## Application Deployment

### Prepare Application

#### Clone Repository
```bash
# Create application directory
sudo mkdir -p /opt/creative-platform
sudo chown $USER:$USER /opt/creative-platform

# Clone repository
cd /opt/creative-platform
git clone https://github.com/your-org/creative-platform-backend.git .

# Install dependencies
npm ci --production
```

#### Environment Configuration
```bash
# Create production environment file
nano .env.production
```

```env
# Environment
NODE_ENV=production
PORT=3000

# Database URLs
DATABASE_URL=postgresql://creative_platform:password@localhost:5432/creative_platform_production
MONGODB_URI=mongodb://creative_platform:password@localhost:27017/creative_platform_production
REDIS_URL=redis://:password@localhost:6379

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRES_IN=24h

# File Storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your-creative-platform-bucket
AWS_S3_REGION=us-east-1

# External APIs
OPENAI_API_KEY=your_openai_api_key
STABILITY_API_KEY=your_stability_api_key
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info

# Security
HELMET_CSP_ENABLED=true
RATE_LIMIT_ENABLED=true
CORS_ORIGIN=https://app.yourdomain.com
```

#### Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database with initial data
npm run seed:production
```

### PM2 Configuration

#### Create PM2 Ecosystem File
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'creative-platform-api',
      script: './src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '.env.production',
      log_file: '/var/log/creative-platform/combined.log',
      out_file: '/var/log/creative-platform/out.log',
      error_file: '/var/log/creative-platform/error.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'creative-platform-worker',
      script: './src/workers/index.js',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'all'
      },
      env_file: '.env.production',
      log_file: '/var/log/creative-platform/worker.log',
      max_memory_restart: '2G',
      restart_delay: 5000
    }
  ]
};
```

#### Deploy with PM2
```bash
# Create log directory
sudo mkdir -p /var/log/creative-platform
sudo chown $USER:$USER /var/log/creative-platform

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check application status
pm2 status
pm2 logs
```

## Load Balancing

### NGINX Configuration

#### Install NGINX
```bash
sudo apt install -y nginx

# Start and enable NGINX
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Configure NGINX
```bash
# Create application configuration
sudo nano /etc/nginx/sites-available/creative-platform
```

```nginx
# Upstream application servers
upstream creative_platform_backend {
    least_conn;
    server 10.0.1.10:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

# Main server block
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        image/svg+xml;

    # Client settings
    client_max_body_size 100M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # Main API routes
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://creative_platform_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
    }

    # File upload routes
    location /api/v1/assets {
        limit_req zone=upload burst=5 nodelay;
        
        proxy_pass http://creative_platform_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_read_timeout 600s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
    }

    # WebSocket support for GraphQL subscriptions
    location /api/graphql {
        proxy_pass http://creative_platform_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://creative_platform_backend;
        proxy_set_header Host $host;
    }

    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Enable NGINX Configuration
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/creative-platform /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx
```

## Monitoring and Logging

### Application Monitoring

#### Install Prometheus
```bash
# Create prometheus user
sudo useradd --no-create-home --shell /bin/false prometheus

# Create directories
sudo mkdir -p /etc/prometheus /var/lib/prometheus
sudo chown prometheus:prometheus /var/lib/prometheus

# Download and install Prometheus
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar xvf prometheus-2.40.0.linux-amd64.tar.gz
sudo cp prometheus-2.40.0.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-2.40.0.linux-amd64/promtool /usr/local/bin/
sudo chown prometheus:prometheus /usr/local/bin/prometheus
sudo chown prometheus:prometheus /usr/local/bin/promtool
```

#### Configure Prometheus
```bash
# Create Prometheus configuration
sudo nano /etc/prometheus/prometheus.yml
```

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "creative_platform_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'creative-platform-api'
    static_configs:
      - targets: 
        - 'localhost:3000'
        - '10.0.1.10:3000'
        - '10.0.1.11:3000'
        - '10.0.1.12:3000'
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']

  - job_name: 'node-exporter'
    static_configs:
      - targets: 
        - 'localhost:9100'
        - '10.0.1.10:9100'
        - '10.0.1.11:9100'
        - '10.0.1.12:9100'
```

#### Install Grafana
```bash
# Add Grafana repository
sudo apt-get install -y software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list

# Install Grafana
sudo apt-get update
sudo apt-get install -y grafana

# Start and enable Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

### Centralized Logging

#### Install ELK Stack
```bash
# Install Elasticsearch
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt-get update && sudo apt-get install elasticsearch

# Configure Elasticsearch
sudo nano /etc/elasticsearch/elasticsearch.yml
```

```yaml
cluster.name: creative-platform-logs
node.name: log-node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: localhost
http.port: 9200
discovery.type: single-node
xpack.security.enabled: false
```

#### Install Logstash
```bash
sudo apt-get install logstash

# Configure Logstash
sudo nano /etc/logstash/conf.d/creative-platform.conf
```

```ruby
input {
  file {
    path => "/var/log/creative-platform/*.log"
    start_position => "beginning"
    codec => "json"
  }
  
  beats {
    port => 5044
  }
}

filter {
  if [fields][service] == "creative-platform" {
    json {
      source => "message"
    }
    
    date {
      match => [ "timestamp", "ISO8601" ]
    }
    
    mutate {
      remove_field => ["@version", "host", "path"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "creative-platform-logs-%{+YYYY.MM.dd}"
  }
}
```

#### Install Kibana
```bash
sudo apt-get install kibana

# Configure Kibana
sudo nano /etc/kibana/kibana.yml
```

```yaml
server.port: 5601
server.host: "localhost"
elasticsearch.hosts: ["http://localhost:9200"]
kibana.index: ".kibana"
```

### Application Metrics

#### Add Prometheus Metrics to Application
```javascript
// src/middleware/metrics.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const designOperations = new prometheus.Counter({
  name: 'design_operations_total',
  help: 'Total number of design operations',
  labelNames: ['operation', 'status']
});

const exportJobs = new prometheus.Gauge({
  name: 'export_jobs_active',
  help: 'Number of active export jobs'
});

// Middleware to collect metrics
const collectMetrics = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};

// Metrics endpoint
const metricsEndpoint = (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
};

module.exports = {
  collectMetrics,
  metricsEndpoint,
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    activeConnections,
    designOperations,
    exportJobs
  }
};
```

## Security Configuration

### Application Security

#### Environment Variables Security
```bash
# Secure environment file permissions
chmod 600 .env.production
chown $USER:$USER .env.production

# Use secrets management for sensitive data
sudo apt install -y vault

# Configure Vault (basic setup)
vault server -config=vault.hcl
vault operator init
vault operator unseal
```

#### API Security Headers
```javascript
// src/middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // limit file uploads
  message: 'Too many upload requests'
});

module.exports = {
  securityHeaders,
  apiLimiter,
  uploadLimiter
};
```

### Database Security

#### PostgreSQL Security
```sql
-- Create read-only user for reporting
CREATE USER creative_platform_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE creative_platform_production TO creative_platform_readonly;
GRANT USAGE ON SCHEMA public TO creative_platform_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO creative_platform_readonly;

-- Create backup user
CREATE USER creative_platform_backup WITH PASSWORD 'backup_password';
GRANT CONNECT ON DATABASE creative_platform_production TO creative_platform_backup;
GRANT USAGE ON SCHEMA public TO creative_platform_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO creative_platform_backup;

-- Enable row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_sets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY users_policy ON users
  FOR ALL TO creative_platform
  USING (id = current_setting('app.current_user_id')::uuid);
```

#### Redis Security
```ini
# /etc/redis/redis.conf

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG "CONFIG_09f911029d74e35bd84156c5635688c0"

# Enable SSL/TLS
port 0
tls-port 6380
tls-cert-file /etc/ssl/certs/redis.crt
tls-key-file /etc/ssl/private/redis.key
tls-ca-cert-file /etc/ssl/certs/ca.crt
```

### Network Security

#### Firewall Configuration
```bash
# Application servers
sudo ufw allow from 10.0.1.0/24 to any port 3000
sudo ufw allow from 10.0.1.0/24 to any port 22

# Database server
sudo ufw allow from 10.0.1.10 to any port 5432
sudo ufw allow from 10.0.1.11 to any port 5432
sudo ufw allow from 10.0.1.12 to any port 5432

# Cache server
sudo ufw allow from 10.0.1.0/24 to any port 6379

# Load balancer
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny all other traffic
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

#### VPN Configuration (Optional)
```bash
# Install WireGuard
sudo apt install -y wireguard

# Generate keys
wg genkey | tee privatekey | wg pubkey > publickey

# Configure WireGuard
sudo nano /etc/wireguard/wg0.conf
```

```ini
[Interface]
PrivateKey = <server_private_key>
Address = 10.0.2.1/24
ListenPort = 51820

[Peer]
PublicKey = <client_public_key>
AllowedIPs = 10.0.2.2/32
```

## Backup and Disaster Recovery

### Database Backup Strategy

#### PostgreSQL Backup
```bash
# Create backup script
sudo nano /opt/scripts/backup-postgresql.sh
```

```bash
#!/bin/bash

# Configuration
DB_NAME="creative_platform_production"
DB_USER="creative_platform_backup"
BACKUP_DIR="/backup/postgresql"
RETENTION_DAYS=30
S3_BUCKET="your-backup-bucket"

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/creative_platform_$(date +%Y%m%d_%H%M%S).sql.gz"

# Create backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/postgresql/

# Clean up old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log completion
echo "$(date): Backup completed - $BACKUP_FILE" >> /var/log/backup.log
```

#### MongoDB Backup
```bash
# Create MongoDB backup script
sudo nano /opt/scripts/backup-mongodb.sh
```

```bash
#!/bin/bash

# Configuration
DB_NAME="creative_platform_production"
BACKUP_DIR="/backup/mongodb"
RETENTION_DAYS=30
S3_BUCKET="your-backup-bucket"

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/mongodb_$(date +%Y%m%d_%H%M%S)"

# Create backup
mongodump --db $DB_NAME --out $BACKUP_FILE

# Compress backup
tar -czf $BACKUP_FILE.tar.gz -C $BACKUP_DIR $(basename $BACKUP_FILE)

# Upload to S3
aws s3 cp $BACKUP_FILE.tar.gz s3://$S3_BUCKET/mongodb/

# Clean up
rm -rf $BACKUP_FILE $BACKUP_FILE.tar.gz
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "$(date): MongoDB backup completed" >> /var/log/backup.log
```

#### Automated Backup Schedule
```bash
# Setup cron jobs
sudo crontab -e

# Add backup schedules
0 2 * * * /opt/scripts/backup-postgresql.sh
30 2 * * * /opt/scripts/backup-mongodb.sh
0 3 * * 0 /opt/scripts/backup-files.sh
```

### Disaster Recovery Plan

#### Recovery Procedures
```bash
# PostgreSQL Recovery
# 1. Stop application
pm2 stop all

# 2. Restore database
gunzip -c backup_file.sql.gz | psql -h localhost -U creative_platform -d creative_platform_production

# 3. Start application
pm2 start all

# MongoDB Recovery
# 1. Stop application
pm2 stop all

# 2. Extract backup
tar -xzf mongodb_backup.tar.gz

# 3. Restore database
mongorestore --db creative_platform_production ./mongodb_backup/creative_platform_production/

# 4. Start application
pm2 start all
```

#### High Availability Setup
```yaml
# docker-compose.ha.yml
version: '3.8'

services:
  postgresql-primary:
    image: postgres:15
    environment:
      POSTGRES_DB: creative_platform_production
      POSTGRES_USER: creative_platform
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_REPLICATION_MODE: master
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${REPLICATION_PASSWORD}
    volumes:
      - postgresql_primary_data:/var/lib/postgresql/data

  postgresql-replica:
    image: postgres:15
    environment:
      POSTGRES_MASTER_SERVICE: postgresql-primary
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${REPLICATION_PASSWORD}
    depends_on:
      - postgresql-primary

  redis-cluster:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
    volumes:
      - redis_data:/data
```

## Performance Optimization

### Database Optimization

#### PostgreSQL Performance Tuning
```sql
-- Create indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_projects_user_id ON projects(user_id);
CREATE INDEX CONCURRENTLY idx_design_sets_project_id ON design_sets(project_id);
CREATE INDEX CONCURRENTLY idx_canvases_design_set_id ON canvases(design_set_id);
CREATE INDEX CONCURRENTLY idx_canvas_objects_canvas_id ON canvas_objects(canvas_id);
CREATE INDEX CONCURRENTLY idx_exports_canvas_id ON export_jobs(canvas_id);
CREATE INDEX CONCURRENTLY idx_exports_status ON export_jobs(status);
CREATE INDEX CONCURRENTLY idx_exports_created_at ON export_jobs(created_at);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_designs_user_project ON design_sets(user_id, project_id);
CREATE INDEX CONCURRENTLY idx_exports_user_status ON export_jobs(user_id, status);

-- Partial indexes for specific conditions
CREATE INDEX CONCURRENTLY idx_active_exports ON export_jobs(canvas_id) 
WHERE status IN ('pending', 'processing');

-- Analyze tables for better query planning
ANALYZE;
```

#### Redis Optimization
```ini
# Memory optimization
maxmemory-policy allkeys-lru
maxmemory-samples 10

# Network optimization
tcp-keepalive 300
tcp-backlog 511

# Persistence optimization
save 900 1
save 300 10
save 60 10000
rdbcompression yes
rdbchecksum yes

# Memory usage optimization
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
```

### Application Performance

#### Node.js Optimization
```javascript
// src/config/performance.js
const cluster = require('cluster');
const os = require('os');

// Cluster configuration
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  const numWorkers = os.cpus().length;
  
  console.log(`Starting ${numWorkers} workers`);
  
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Memory optimization
  if (process.env.NODE_ENV === 'production') {
    require('v8').setFlagsFromString('--max-old-space-size=1024');
    require('v8').setFlagsFromString('--optimize-for-size');
  }
  
  // Start application
  require('./server');
}
```

#### Caching Strategy
```javascript
// src/middleware/cache.js
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

const cache = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await client.get(key);
      
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Override res.json to cache response
      const originalJson = res.json;
      res.json = function(data) {
        client.setex(key, duration, JSON.stringify(data));
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

module.exports = { cache };
```

### CDN Configuration

#### CloudFront Setup
```json
{
  "DistributionConfig": {
    "CallerReference": "creative-platform-cdn",
    "Comment": "Creative Platform CDN",
    "DefaultCacheBehavior": {
      "TargetOriginId": "creative-platform-api",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
      "Compress": true
    },
    "Origins": [
      {
        "Id": "creative-platform-api",
        "DomainName": "api.yourdomain.com",
        "CustomOriginConfig": {
          "HTTPPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": ["TLSv1.2"]
        }
      }
    ],
    "CacheBehaviors": [
      {
        "PathPattern": "/api/v1/assets/*",
        "TargetOriginId": "creative-platform-api",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "TTL": 86400
      }
    ],
    "Enabled": true,
    "PriceClass": "PriceClass_All"
  }
}
```

## Scaling Strategies

### Horizontal Scaling

#### Auto Scaling Configuration
```yaml
# kubernetes-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: creative-platform-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: creative-platform-api
  template:
    metadata:
      labels:
        app: creative-platform-api
    spec:
      containers:
      - name: api
        image: creative-platform/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: creative-platform-api-service
spec:
  selector:
    app: creative-platform-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: creative-platform-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: creative-platform-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Database Scaling

#### Read Replicas Setup
```javascript
// src/config/database.js
const { PrismaClient } = require('@prisma/client');

// Primary database connection (write operations)
const primaryDB = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Read replica connections
const readReplicas = [
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_READ_REPLICA_1_URL
      }
    }
  }),
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_READ_REPLICA_2_URL
      }
    }
  })
];

// Connection router
class DatabaseRouter {
  constructor() {
    this.readReplicaIndex = 0;
  }

  // Route read operations to replicas
  getReadConnection() {
    const replica = readReplicas[this.readReplicaIndex];
    this.readReplicaIndex = (this.readReplicaIndex + 1) % readReplicas.length;
    return replica;
  }

  // Route write operations to primary
  getWriteConnection() {
    return primaryDB;
  }

  // Smart routing based on operation type
  getConnection(operation = 'read') {
    if (operation === 'write' || operation === 'delete' || operation === 'update') {
      return this.getWriteConnection();
    }
    return this.getReadConnection();
  }
}

const dbRouter = new DatabaseRouter();

module.exports = {
  primaryDB,
  readReplicas,
  dbRouter
};
```

### Queue Scaling

#### BullMQ Queue Configuration
```javascript
// src/workers/scalableQueue.js
const { Queue, Worker, QueueScheduler } = require('bullmq');
const Redis = require('ioredis');

// Redis cluster configuration
const redisCluster = new Redis.Cluster([
  { host: '10.0.1.20', port: 7000 },
  { host: '10.0.1.21', port: 7000 },
  { host: '10.0.1.22', port: 7000 }
]);

// Export queue with scaling configuration
const exportQueue = new Queue('export-jobs', {
  connection: redisCluster,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Worker scaling based on queue size
class ScalableWorker {
  constructor(queueName, processor) {
    this.queueName = queueName;
    this.processor = processor;
    this.workers = [];
    this.minWorkers = 2;
    this.maxWorkers = 10;
    this.scaleCheckInterval = 30000; // 30 seconds
  }

  async start() {
    // Start minimum workers
    for (let i = 0; i < this.minWorkers; i++) {
      this.createWorker();
    }

    // Monitor queue and scale workers
    setInterval(() => this.checkAndScale(), this.scaleCheckInterval);
  }

  createWorker() {
    const worker = new Worker(this.queueName, this.processor, {
      connection: redisCluster,
      concurrency: 5
    });

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.log(`Job ${job.id} failed:`, err);
    });

    this.workers.push(worker);
    return worker;
  }

  async checkAndScale() {
    const queue = new Queue(this.queueName, { connection: redisCluster });
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    
    const queueLoad = waiting.length + active.length;
    const currentWorkers = this.workers.length;

    // Scale up if queue is growing
    if (queueLoad > currentWorkers * 5 && currentWorkers < this.maxWorkers) {
      console.log(`Scaling up: ${currentWorkers} -> ${currentWorkers + 1}`);
      this.createWorker();
    }

    // Scale down if queue is empty
    if (queueLoad === 0 && currentWorkers > this.minWorkers) {
      console.log(`Scaling down: ${currentWorkers} -> ${currentWorkers - 1}`);
      const worker = this.workers.pop();
      await worker.close();
    }
  }
}

module.exports = { ScalableWorker, exportQueue };
```

## Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check Node.js heap usage
pm2 monit

# Optimize Node.js memory
pm2 restart all --max-memory-restart 1G
```

#### Database Connection Issues
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Kill problematic queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '10 minutes';
```

#### Cache Issues
```bash
# Check Redis memory usage
redis-cli info memory

# Check cache hit rate
redis-cli info stats | grep keyspace_hits

# Clear cache if needed
redis-cli FLUSHDB
```

### Performance Monitoring

#### Health Check Script
```bash
#!/bin/bash
# /opt/scripts/health-check.sh

# Check application health
curl -f http://localhost:3000/health || exit 1

# Check database connectivity
pg_isready -h localhost -p 5432 || exit 1

# Check Redis connectivity
redis-cli ping | grep PONG || exit 1

# Check disk space
df -h | awk '$5 > 85 {print $0; exit 1}'

# Check memory usage
free | awk 'NR==2{printf "Memory Usage: %s/%s (%.2f%%)\n", $3,$2,$3*100/$2 }'

echo "All health checks passed"
```

#### Log Analysis
```bash
# Analyze error logs
tail -f /var/log/creative-platform/error.log | grep ERROR

# Monitor slow queries
tail -f /var/log/postgresql/postgresql.log | grep "slow query"

# Check application metrics
curl http://localhost:3000/metrics | grep -E "(http_requests_total|response_time)"
```

This deployment guide provides a comprehensive foundation for running the Creative Design Platform in production. Adjust configurations based on your specific infrastructure and requirements.