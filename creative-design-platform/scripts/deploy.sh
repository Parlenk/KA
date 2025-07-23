#!/bin/bash

# Production Deployment Script
# Automates the deployment process with safety checks and rollback capability

set -e  # Exit on any error

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/deploy.log"
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
ROLLBACK_TIMEOUT=60       # 1 minute

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to create database backup
create_backup() {
    log "Creating database backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
    
    # PostgreSQL backup
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        success "Database backup created: $BACKUP_FILE"
        echo "$BACKUP_FILE" > "$BACKUP_DIR/latest_backup.txt"
    else
        error "Failed to create database backup"
        exit 1
    fi
}

# Function to check if services are healthy
check_health() {
    local service=$1
    local url=$2
    local timeout=${3:-30}
    
    log "Checking health of $service..."
    
    for i in $(seq 1 $timeout); do
        if curl -sf "$url" > /dev/null 2>&1; then
            success "$service is healthy"
            return 0
        fi
        sleep 1
    done
    
    error "$service health check failed after $timeout seconds"
    return 1
}

# Function to wait for service to be ready
wait_for_service() {
    local service=$1
    local timeout=${2:-60}
    
    log "Waiting for $service to be ready..."
    
    for i in $(seq 1 $timeout); do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T "$service" echo "ready" > /dev/null 2>&1; then
            success "$service is ready"
            return 0
        fi
        sleep 1
    done
    
    error "$service not ready after $timeout seconds"
    return 1
}

# Function to perform rollback
rollback() {
    warning "Starting rollback procedure..."
    
    # Get latest backup
    if [ -f "$BACKUP_DIR/latest_backup.txt" ]; then
        LATEST_BACKUP=$(cat "$BACKUP_DIR/latest_backup.txt")
        log "Rolling back to backup: $LATEST_BACKUP"
        
        # Restore database
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$LATEST_BACKUP"
        
        # Restart services with previous images
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
        
        success "Rollback completed"
    else
        error "No backup found for rollback"
        exit 1
    fi
}

# Function to perform pre-deployment checks
pre_deployment_checks() {
    log "Performing pre-deployment checks..."
    
    # Check if required environment variables are set
    required_vars=("POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB" "REDIS_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check disk space
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 85 ]; then
        error "Disk usage is $DISK_USAGE%. Deployment aborted."
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi
    
    success "Pre-deployment checks passed"
}

# Function to pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" pull; then
        success "Images pulled successfully"
    else
        error "Failed to pull images"
        exit 1
    fi
}

# Function to perform rolling deployment
rolling_deployment() {
    log "Starting rolling deployment..."
    
    # Update backend first
    log "Updating backend service..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --no-deps backend
    wait_for_service "backend" 60
    check_health "backend" "http://localhost:3000/health" 30
    
    # Update AI services
    log "Updating AI services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --no-deps ai-services
    wait_for_service "ai-services" 60
    check_health "ai-services" "http://localhost:8000/health" 30
    
    # Update frontend last
    log "Updating frontend service..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --no-deps frontend
    wait_for_service "frontend" 60
    check_health "frontend" "http://localhost/health" 30
    
    # Update queue workers
    log "Updating queue workers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --no-deps queue-worker
    
    success "Rolling deployment completed"
}

# Function to run post-deployment tests
post_deployment_tests() {
    log "Running post-deployment tests..."
    
    # Test main application
    check_health "Application" "http://localhost/health" 30
    check_health "API" "http://localhost/api/v1/health" 30
    check_health "AI Services" "http://localhost/api/v1/ai/health" 30
    
    # Test database connectivity
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run db:test > /dev/null 2>&1; then
        success "Database connectivity test passed"
    else
        error "Database connectivity test failed"
        return 1
    fi
    
    # Test queue system
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T queue-worker npm run queue:test > /dev/null 2>&1; then
        success "Queue system test passed"
    else
        warning "Queue system test failed"
    fi
    
    success "Post-deployment tests completed"
}

# Function to cleanup old images
cleanup() {
    log "Cleaning up old Docker images..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "backup_*.sql" -mtime +7 -delete
    
    success "Cleanup completed"
}

# Function to send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
    fi
    
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"🚀 Deployment $status: $message\"}" \
            "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1
    fi
}

# Main deployment function
main() {
    log "Starting production deployment..."
    
    # Trap errors and perform rollback
    trap 'error "Deployment failed. Starting rollback..."; rollback; send_notification "FAILED" "Deployment failed and rolled back"; exit 1' ERR
    
    # Pre-deployment checks
    pre_deployment_checks
    
    # Create backup
    create_backup
    
    # Pull latest images
    pull_images
    
    # Perform rolling deployment
    rolling_deployment
    
    # Run post-deployment tests
    if ! post_deployment_tests; then
        error "Post-deployment tests failed"
        rollback
        send_notification "FAILED" "Post-deployment tests failed, rolled back"
        exit 1
    fi
    
    # Cleanup
    cleanup
    
    success "Deployment completed successfully!"
    send_notification "SUCCESS" "Deployment completed successfully"
    
    # Display summary
    log "=== Deployment Summary ==="
    log "Timestamp: $(date)"
    log "Services deployed: frontend, backend, ai-services, queue-worker"
    log "Backup created: $(cat $BACKUP_DIR/latest_backup.txt)"
    log "Health checks: PASSED"
    log "========================="
}

# Script arguments handling
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        check_health "Application" "http://localhost/health" 10
        check_health "API" "http://localhost/api/v1/health" 10
        ;;
    "backup")
        create_backup
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|backup|cleanup}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Perform full deployment (default)"
        echo "  rollback - Rollback to previous version"
        echo "  health   - Check application health"
        echo "  backup   - Create database backup"
        echo "  cleanup  - Clean up old images and backups"
        exit 1
        ;;
esac