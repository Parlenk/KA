#!/bin/bash

# Comprehensive Security Scanning Script
# Performs automated security checks for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCAN_RESULTS_DIR="/var/log/security-scans"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$SCAN_RESULTS_DIR/security_scan_$TIMESTAMP.json"

# Create results directory
mkdir -p "$SCAN_RESULTS_DIR"

# Initialize report
REPORT="{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"scans\": {}}"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to update report
update_report() {
    local scan_name=$1
    local result=$2
    REPORT=$(echo "$REPORT" | jq ".scans.\"$scan_name\" = $result")
}

# Function to scan for dependency vulnerabilities
scan_dependencies() {
    log "Scanning for dependency vulnerabilities..."
    
    local result='{"status": "completed", "vulnerabilities": [], "summary": {}}'
    
    # Frontend dependencies
    if [ -f "frontend/package.json" ]; then
        cd frontend
        if command -v npm &> /dev/null; then
            local npm_audit=$(npm audit --json 2>/dev/null || echo '{"vulnerabilities": {}}')
            local vuln_count=$(echo "$npm_audit" | jq '.metadata.vulnerabilities.total // 0')
            
            if [ "$vuln_count" -gt 0 ]; then
                warning "Found $vuln_count vulnerabilities in frontend dependencies"
                result=$(echo "$result" | jq ".vulnerabilities += [\"Frontend: $vuln_count vulnerabilities\"]")
            else
                success "No vulnerabilities found in frontend dependencies"
            fi
        fi
        cd ..
    fi
    
    # Backend dependencies
    if [ -f "backend/package.json" ]; then
        cd backend
        if command -v npm &> /dev/null; then
            local npm_audit=$(npm audit --json 2>/dev/null || echo '{"vulnerabilities": {}}')
            local vuln_count=$(echo "$npm_audit" | jq '.metadata.vulnerabilities.total // 0')
            
            if [ "$vuln_count" -gt 0 ]; then
                warning "Found $vuln_count vulnerabilities in backend dependencies"
                result=$(echo "$result" | jq ".vulnerabilities += [\"Backend: $vuln_count vulnerabilities\"]")
            else
                success "No vulnerabilities found in backend dependencies"
            fi
        fi
        cd ..
    fi
    
    update_report "dependency_scan" "$result"
}

# Function to scan Docker images
scan_docker_images() {
    log "Scanning Docker images for vulnerabilities..."
    
    local result='{"status": "completed", "vulnerabilities": [], "images_scanned": []}'
    
    if command -v trivy &> /dev/null; then
        # Get list of images from docker-compose
        local images=()
        if [ -f "docker-compose.prod.yml" ]; then
            # Extract image names from docker-compose file
            images+=($(grep -E "^\s*image:" docker-compose.prod.yml | awk '{print $2}' | tr -d '"'))
        fi
        
        # Add built images
        images+=("creative-design-platform-frontend" "creative-design-platform-backend" "creative-design-platform-ai")
        
        for image in "${images[@]}"; do
            if docker image inspect "$image" &> /dev/null; then
                log "Scanning image: $image"
                local scan_output=$(trivy image --format json "$image" 2>/dev/null || echo '{"Results": []}')
                local vulns=$(echo "$scan_output" | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH" or .Severity == "CRITICAL")] | length')
                
                result=$(echo "$result" | jq ".images_scanned += [\"$image\"]")
                
                if [ "$vulns" -gt 0 ]; then
                    warning "Found $vulns high/critical vulnerabilities in $image"
                    result=$(echo "$result" | jq ".vulnerabilities += [\"$image: $vulns high/critical vulnerabilities\"]")
                else
                    success "No critical vulnerabilities found in $image"
                fi
            fi
        done
    else
        warning "Trivy not installed, skipping Docker image scanning"
        result=$(echo "$result" | jq '.status = "skipped" | .reason = "trivy not available"')
    fi
    
    update_report "docker_scan" "$result"
}

# Function to check SSL/TLS configuration
check_ssl_config() {
    log "Checking SSL/TLS configuration..."
    
    local result='{"status": "completed", "issues": [], "grade": "A+"}'
    
    # Check certificate files
    if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
        # Check certificate validity
        local cert_expiry=$(openssl x509 -in ssl/cert.pem -noout -enddate 2>/dev/null | cut -d= -f2)
        local expiry_timestamp=$(date -d "$cert_expiry" +%s 2>/dev/null || echo 0)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ "$days_until_expiry" -lt 30 ]; then
            warning "SSL certificate expires in $days_until_expiry days"
            result=$(echo "$result" | jq ".issues += [\"Certificate expires in $days_until_expiry days\"]")
            result=$(echo "$result" | jq '.grade = "B"')
        elif [ "$days_until_expiry" -lt 7 ]; then
            error "SSL certificate expires in $days_until_expiry days"
            result=$(echo "$result" | jq ".issues += [\"Certificate expires in $days_until_expiry days - URGENT\"]")
            result=$(echo "$result" | jq '.grade = "F"')
        else
            success "SSL certificate is valid for $days_until_expiry days"
        fi
        
        # Check key strength
        local key_size=$(openssl rsa -in ssl/key.pem -text -noout 2>/dev/null | grep "Private-Key:" | grep -o '[0-9]*')
        if [ "$key_size" -lt 2048 ]; then
            warning "SSL key size ($key_size bits) is below recommended 2048 bits"
            result=$(echo "$result" | jq ".issues += [\"Key size $key_size bits is below recommended 2048 bits\"]")
            result=$(echo "$result" | jq '.grade = "C"')
        else
            success "SSL key size is adequate ($key_size bits)"
        fi
    else
        error "SSL certificate files not found"
        result=$(echo "$result" | jq '.status = "failed" | .issues += ["SSL certificate files not found"] | .grade = "F"')
    fi
    
    update_report "ssl_check" "$result"
}

# Function to check network security
check_network_security() {
    log "Checking network security configuration..."
    
    local result='{"status": "completed", "issues": [], "open_ports": []}'
    
    # Check for open ports
    if command -v ss &> /dev/null; then
        local open_ports=$(ss -tuln | grep LISTEN | awk '{print $5}' | cut -d: -f2 | sort -n | uniq)
        
        while IFS= read -r port; do
            if [ -n "$port" ]; then
                result=$(echo "$result" | jq ".open_ports += [\"$port\"]")
                
                # Check for potentially dangerous ports
                case $port in
                    22)
                        warning "SSH port 22 is open - ensure strong authentication"
                        ;;
                    80|443)
                        success "HTTP/HTTPS ports are open as expected"
                        ;;
                    3000|8000|9090|3001|5601)
                        warning "Application port $port is exposed - ensure proper firewall rules"
                        result=$(echo "$result" | jq ".issues += [\"Application port $port exposed\"]")
                        ;;
                    5432|27017|6379)
                        error "Database port $port is exposed - SECURITY RISK"
                        result=$(echo "$result" | jq ".issues += [\"Database port $port exposed - CRITICAL\"]")
                        ;;
                esac
            fi
        done <<< "$open_ports"
    fi
    
    # Check firewall status
    if command -v ufw &> /dev/null; then
        local ufw_status=$(ufw status | head -1 | awk '{print $2}')
        if [ "$ufw_status" = "active" ]; then
            success "UFW firewall is active"
        else
            warning "UFW firewall is not active"
            result=$(echo "$result" | jq '.issues += ["Firewall not active"]')
        fi
    fi
    
    update_report "network_check" "$result"
}

# Function to check file permissions
check_file_permissions() {
    log "Checking file permissions..."
    
    local result='{"status": "completed", "issues": []}'
    
    # Check for world-writable files
    local writable_files=$(find . -type f -perm -002 2>/dev/null | head -10)
    if [ -n "$writable_files" ]; then
        warning "Found world-writable files:"
        echo "$writable_files"
        result=$(echo "$result" | jq '.issues += ["World-writable files found"]')
    fi
    
    # Check for SUID/SGID files
    local suid_files=$(find . -type f \( -perm -4000 -o -perm -2000 \) 2>/dev/null | head -10)
    if [ -n "$suid_files" ]; then
        warning "Found SUID/SGID files:"
        echo "$suid_files"
        result=$(echo "$result" | jq '.issues += ["SUID/SGID files found"]')
    fi
    
    # Check sensitive file permissions
    local sensitive_files=(".env" "ssl/key.pem" "config/database.yml")
    for file in "${sensitive_files[@]}"; do
        if [ -f "$file" ]; then
            local perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%Lp" "$file" 2>/dev/null)
            if [ "${perms: -2}" != "00" ]; then
                warning "Sensitive file $file has overly permissive permissions: $perms"
                result=$(echo "$result" | jq ".issues += [\"$file has permissions $perms\"]")
            else
                success "File $file has secure permissions"
            fi
        fi
    done
    
    update_report "permissions_check" "$result"
}

# Function to check for secrets in code
check_secrets() {
    log "Scanning for hardcoded secrets..."
    
    local result='{"status": "completed", "secrets_found": [], "files_scanned": 0}'
    
    # Patterns to look for
    local patterns=(
        "password\s*=\s*['\"][^'\"]{8,}['\"]"
        "api_key\s*=\s*['\"][^'\"]{20,}['\"]"
        "secret\s*=\s*['\"][^'\"]{16,}['\"]"
        "token\s*=\s*['\"][^'\"]{20,}['\"]"
        "-----BEGIN.*PRIVATE KEY-----"
        "aws_access_key_id\s*=\s*['\"][^'\"]{16,}['\"]"
        "aws_secret_access_key\s*=\s*['\"][^'\"]{32,}['\"]"
    )
    
    local files_scanned=0
    local secrets_found=0
    
    # Scan source files
    while IFS= read -r -d '' file; do
        files_scanned=$((files_scanned + 1))
        
        for pattern in "${patterns[@]}"; do
            if grep -qiE "$pattern" "$file" 2>/dev/null; then
                warning "Potential secret found in $file"
                result=$(echo "$result" | jq ".secrets_found += [\"$file\"]")
                secrets_found=$((secrets_found + 1))
                break
            fi
        done
    done < <(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.yml" -o -name "*.yaml" \) -not -path "./node_modules/*" -not -path "./.git/*" -print0)
    
    result=$(echo "$result" | jq ".files_scanned = $files_scanned")
    
    if [ "$secrets_found" -eq 0 ]; then
        success "No hardcoded secrets found in $files_scanned files"
    else
        error "Found potential secrets in $secrets_found files"
    fi
    
    update_report "secrets_scan" "$result"
}

# Function to check environment configuration
check_environment() {
    log "Checking environment configuration..."
    
    local result='{"status": "completed", "issues": [], "checks": {}}'
    
    # Check for required environment variables
    local required_vars=("JWT_SECRET" "DATABASE_URL" "REDIS_URL")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Missing required environment variables: ${missing_vars[*]}"
        result=$(echo "$result" | jq ".issues += [\"Missing environment variables: ${missing_vars[*]}\"]")
    else
        success "All required environment variables are set"
    fi
    
    # Check JWT secret strength
    if [ -n "$JWT_SECRET" ] && [ ${#JWT_SECRET} -lt 32 ]; then
        warning "JWT_SECRET is shorter than recommended 32 characters"
        result=$(echo "$result" | jq '.issues += ["JWT_SECRET too short"]')
    fi
    
    # Check if running in production mode
    if [ "$NODE_ENV" != "production" ]; then
        warning "NODE_ENV is not set to 'production'"
        result=$(echo "$result" | jq '.issues += ["NODE_ENV not set to production"]')
    else
        success "NODE_ENV is correctly set to production"
    fi
    
    update_report "environment_check" "$result"
}

# Function to check database security
check_database_security() {
    log "Checking database security..."
    
    local result='{"status": "completed", "issues": []}'
    
    # Check if database is accessible from outside
    if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
        # Try to connect and check user permissions
        local db_check=$(psql "$DATABASE_URL" -c "SELECT current_user, inet_server_addr();" 2>/dev/null || echo "CONNECTION_FAILED")
        
        if [[ "$db_check" == *"CONNECTION_FAILED"* ]]; then
            warning "Could not connect to database for security check"
            result=$(echo "$result" | jq '.issues += ["Database connection failed"]')
        else
            success "Database connection successful"
        fi
    fi
    
    # Check for default passwords
    if [[ "$DATABASE_URL" == *"password"* ]] || [[ "$DATABASE_URL" == *"123456"* ]]; then
        error "Database appears to use a default password"
        result=$(echo "$result" | jq '.issues += ["Potential default database password"]')
    fi
    
    update_report "database_check" "$result"
}

# Function to generate security score
calculate_security_score() {
    log "Calculating security score..."
    
    local total_issues=$(echo "$REPORT" | jq '[.scans[].issues[]?, .scans[].vulnerabilities[]?, .scans[].secrets_found[]?] | length')
    local total_scans=$(echo "$REPORT" | jq '.scans | keys | length')
    
    # Base score
    local score=100
    
    # Deduct points for issues
    score=$((score - total_issues * 5))
    
    # Minimum score
    if [ "$score" -lt 0 ]; then
        score=0
    fi
    
    local grade="A+"
    if [ "$score" -lt 95 ]; then grade="A"; fi
    if [ "$score" -lt 85 ]; then grade="B"; fi
    if [ "$score" -lt 75 ]; then grade="C"; fi
    if [ "$score" -lt 65 ]; then grade="D"; fi
    if [ "$score" -lt 50 ]; then grade="F"; fi
    
    REPORT=$(echo "$REPORT" | jq ".summary = {\"score\": $score, \"grade\": \"$grade\", \"total_issues\": $total_issues, \"scans_completed\": $total_scans}")
    
    if [ "$score" -ge 85 ]; then
        success "Security score: $score ($grade)"
    elif [ "$score" -ge 70 ]; then
        warning "Security score: $score ($grade)"
    else
        error "Security score: $score ($grade)"
    fi
}

# Main execution
main() {
    log "Starting comprehensive security scan..."
    
    # Run all security checks
    scan_dependencies
    scan_docker_images
    check_ssl_config
    check_network_security
    check_file_permissions
    check_secrets
    check_environment
    check_database_security
    
    # Calculate final score
    calculate_security_score
    
    # Save report
    echo "$REPORT" | jq . > "$REPORT_FILE"
    
    log "Security scan completed. Report saved to: $REPORT_FILE"
    
    # Display summary
    echo
    echo "=== SECURITY SCAN SUMMARY ==="
    echo "$REPORT" | jq -r '.summary | "Score: \(.score)/100 (\(.grade))\nTotal Issues: \(.total_issues)\nScans Completed: \(.scans_completed)"'
    echo "============================="
    
    # Exit with error code if score is too low
    local score=$(echo "$REPORT" | jq -r '.summary.score')
    if [ "$score" -lt 70 ]; then
        error "Security score too low for production deployment"
        exit 1
    fi
}

# Check for required tools
check_dependencies() {
    local missing_tools=()
    
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if ! command -v openssl &> /dev/null; then
        missing_tools+=("openssl")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
}

# Script execution
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    check_dependencies
    main "$@"
fi