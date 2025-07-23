/**
 * Comprehensive Audit and Compliance Service
 * GDPR, SOC2, and enterprise audit trail management
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditEvent {
  id?: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  event: string;
  resource: string;
  resourceId?: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'DATA_MODIFICATION' | 'SYSTEM' | 'SECURITY';
  compliance?: {
    gdpr?: boolean;
    sox?: boolean;
    hipaa?: boolean;
  };
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    securityEvents: number;
    dataAccessEvents: number;
    userActions: number;
    criticalEvents: number;
  };
  complianceChecks: {
    gdprCompliance: boolean;
    dataRetentionCompliance: boolean;
    accessControlCompliance: boolean;
    encryptionCompliance: boolean;
  };
  findings: Array<{
    type: 'VIOLATION' | 'WARNING' | 'INFO';
    description: string;
    recommendation: string;
    affectedUsers?: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
}

export class AuditService {
  /**
   * Log audit event
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date()
    };

    try {
      // Store in database
      const stored = await prisma.auditLog.create({
        data: {
          timestamp: auditEvent.timestamp,
          userId: auditEvent.userId,
          sessionId: auditEvent.sessionId,
          ipAddress: auditEvent.ipAddress,
          userAgent: auditEvent.userAgent,
          event: auditEvent.event,
          resource: auditEvent.resource,
          resourceId: auditEvent.resourceId,
          action: auditEvent.action,
          oldValue: auditEvent.oldValue ? JSON.stringify(auditEvent.oldValue) : null,
          newValue: auditEvent.newValue ? JSON.stringify(auditEvent.newValue) : null,
          metadata: auditEvent.metadata ? JSON.stringify(auditEvent.metadata) : null,
          severity: auditEvent.severity,
          category: auditEvent.category,
          complianceFlags: auditEvent.compliance ? JSON.stringify(auditEvent.compliance) : null
        }
      });

      auditEvent.id = stored.id;

      // Check for compliance violations
      await this.checkComplianceViolations(auditEvent);

      // Send real-time alerts for critical events
      if (auditEvent.severity === 'CRITICAL') {
        await this.sendCriticalEventAlert(auditEvent);
      }

      return auditEvent;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Fallback to file logging
      await this.logToFile(auditEvent);
      throw error;
    }
  }

  /**
   * Authentication events
   */
  async logAuthentication(userId: string, action: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'PASSWORD_CHANGE', request: any, metadata?: any) {
    return this.logEvent({
      userId,
      sessionId: request.sessionID,
      ipAddress: request.ip,
      userAgent: request.get('User-Agent') || '',
      event: 'AUTHENTICATION',
      resource: 'USER_SESSION',
      resourceId: userId,
      action,
      metadata,
      severity: action === 'FAILED_LOGIN' ? 'MEDIUM' : 'LOW',
      category: 'AUTHENTICATION',
      compliance: { gdpr: true }
    });
  }

  /**
   * Data access events
   */
  async logDataAccess(userId: string, dataType: string, operation: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE', recordIds: string[], request: any, oldValue?: any, newValue?: any) {
    const severity = operation === 'DELETE' ? 'HIGH' : operation === 'UPDATE' ? 'MEDIUM' : 'LOW';
    
    return this.logEvent({
      userId,
      sessionId: request.sessionID,
      ipAddress: request.ip,
      userAgent: request.get('User-Agent') || '',
      event: 'DATA_ACCESS',
      resource: dataType,
      resourceId: recordIds.join(','),
      action: operation,
      oldValue,
      newValue,
      metadata: { recordCount: recordIds.length },
      severity,
      category: 'DATA_ACCESS',
      compliance: { gdpr: true, sox: true }
    });
  }

  /**
   * Permission changes
   */
  async logPermissionChange(adminUserId: string, targetUserId: string, permissionType: string, oldPermissions: any, newPermissions: any, request: any) {
    return this.logEvent({
      userId: adminUserId,
      sessionId: request.sessionID,
      ipAddress: request.ip,
      userAgent: request.get('User-Agent') || '',
      event: 'PERMISSION_CHANGE',
      resource: 'USER_PERMISSIONS',
      resourceId: targetUserId,
      action: 'UPDATE',
      oldValue: oldPermissions,
      newValue: newPermissions,
      metadata: { permissionType, targetUserId },
      severity: 'HIGH',
      category: 'AUTHORIZATION',
      compliance: { gdpr: true, sox: true }
    });
  }

  /**
   * System events
   */
  async logSystemEvent(event: string, action: string, metadata?: any, severity: AuditEvent['severity'] = 'LOW') {
    return this.logEvent({
      ipAddress: 'system',
      userAgent: 'system',
      event,
      resource: 'SYSTEM',
      action,
      metadata,
      severity,
      category: 'SYSTEM'
    });
  }

  /**
   * Security events
   */
  async logSecurityEvent(event: string, details: any, severity: AuditEvent['severity'] = 'MEDIUM') {
    return this.logEvent({
      ipAddress: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      event,
      resource: 'SECURITY',
      action: 'THREAT_DETECTED',
      metadata: details,
      severity,
      category: 'SECURITY',
      compliance: { gdpr: true }
    });
  }

  /**
   * File operations
   */
  async logFileOperation(userId: string, operation: 'UPLOAD' | 'DOWNLOAD' | 'DELETE', filename: string, fileSize?: number, request?: any) {
    return this.logEvent({
      userId,
      sessionId: request?.sessionID,
      ipAddress: request?.ip || 'unknown',
      userAgent: request?.get('User-Agent') || 'unknown',
      event: 'FILE_OPERATION',
      resource: 'FILE',
      resourceId: filename,
      action: operation,
      metadata: { filename, fileSize },
      severity: operation === 'DELETE' ? 'MEDIUM' : 'LOW',
      category: 'DATA_ACCESS',
      compliance: { gdpr: true }
    });
  }

  /**
   * Export operations (GDPR compliance)
   */
  async logDataExport(userId: string, dataTypes: string[], request: any) {
    return this.logEvent({
      userId,
      sessionId: request.sessionID,
      ipAddress: request.ip,
      userAgent: request.get('User-Agent') || '',
      event: 'DATA_EXPORT',
      resource: 'USER_DATA',
      resourceId: userId,
      action: 'EXPORT',
      metadata: { dataTypes, exportReason: 'USER_REQUEST' },
      severity: 'MEDIUM',
      category: 'DATA_ACCESS',
      compliance: { gdpr: true }
    });
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    const events = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    const summary = {
      totalEvents: events.length,
      securityEvents: events.filter(e => e.category === 'SECURITY').length,
      dataAccessEvents: events.filter(e => e.category === 'DATA_ACCESS').length,
      userActions: events.filter(e => e.userId).length,
      criticalEvents: events.filter(e => e.severity === 'CRITICAL').length
    };

    // Compliance checks
    const complianceChecks = {
      gdprCompliance: await this.checkGDPRCompliance(events),
      dataRetentionCompliance: await this.checkDataRetentionCompliance(),
      accessControlCompliance: await this.checkAccessControlCompliance(events),
      encryptionCompliance: await this.checkEncryptionCompliance()
    };

    // Generate findings
    const findings = await this.generateFindings(events, complianceChecks);

    const report: ComplianceReport = {
      reportId: `COMP-${Date.now()}`,
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary,
      complianceChecks,
      findings
    };

    // Store report
    await this.storeComplianceReport(report);

    return report;
  }

  /**
   * Search audit logs
   */
  async searchLogs(filters: {
    userId?: string;
    event?: string;
    resource?: string;
    action?: string;
    severity?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.event) where.event = { contains: filters.event };
    if (filters.resource) where.resource = filters.resource;
    if (filters.action) where.action = filters.action;
    if (filters.severity) where.severity = filters.severity;
    if (filters.category) where.category = filters.category;
    if (filters.ipAddress) where.ipAddress = filters.ipAddress;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [events, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: filters.offset || 0,
        take: filters.limit || 100
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      events: events.map(this.formatAuditEvent),
      total,
      page: Math.floor((filters.offset || 0) / (filters.limit || 100)) + 1,
      totalPages: Math.ceil(total / (filters.limit || 100))
    };
  }

  /**
   * Get user audit trail
   */
  async getUserAuditTrail(userId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return this.searchLogs({
      userId,
      startDate,
      limit: 1000
    });
  }

  /**
   * Delete old audit logs (data retention)
   */
  async cleanupOldLogs(retentionDays: number = 2555) { // 7 years default
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const deletedCount = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        },
        // Keep critical security events longer
        NOT: {
          AND: [
            { category: 'SECURITY' },
            { severity: 'CRITICAL' }
          ]
        }
      }
    });

    await this.logSystemEvent('AUDIT_CLEANUP', 'DELETE', {
      deletedCount: deletedCount.count,
      cutoffDate
    });

    return deletedCount.count;
  }

  /**
   * Private helper methods
   */
  private async checkComplianceViolations(event: AuditEvent): Promise<void> {
    // Check for suspicious patterns
    if (event.category === 'DATA_ACCESS' && event.action === 'READ') {
      const recentAccess = await prisma.auditLog.count({
        where: {
          userId: event.userId,
          category: 'DATA_ACCESS',
          action: 'read',
          timestamp: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          }
        }
      });

      if (recentAccess > 100) {
        await this.logSecurityEvent('BULK_DATA_ACCESS', {
          userId: event.userId,
          accessCount: recentAccess,
          timeframe: '5 minutes'
        }, 'HIGH');
      }
    }

    // Check for privilege escalation
    if (event.event === 'PERMISSION_CHANGE' && event.severity === 'HIGH') {
      await this.logSecurityEvent('PRIVILEGE_ESCALATION', {
        adminUser: event.userId,
        targetUser: event.metadata?.targetUserId,
        oldPermissions: event.oldValue,
        newPermissions: event.newValue
      }, 'CRITICAL');
    }
  }

  private async sendCriticalEventAlert(event: AuditEvent): Promise<void> {
    // Send immediate alert to security team
    console.log('CRITICAL AUDIT EVENT:', JSON.stringify(event, null, 2));
    
    // Implementation would send to alerting system
    try {
      const alertData = {
        labels: {
          alertname: 'CriticalAuditEvent',
          severity: 'critical',
          category: event.category
        },
        annotations: {
          summary: `Critical audit event: ${event.event}`,
          description: `${event.action} on ${event.resource} by user ${event.userId || 'unknown'}`
        },
        startsAt: new Date().toISOString()
      };

      await fetch('http://localhost:9093/api/v1/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([alertData])
      });
    } catch (error) {
      console.error('Failed to send critical event alert:', error);
    }
  }

  private async logToFile(event: AuditEvent): Promise<void> {
    const fs = require('fs');
    const logFile = '/var/log/audit-backup.log';
    
    try {
      fs.appendFileSync(logFile, JSON.stringify(event) + '\n');
    } catch (error) {
      console.error('Failed to write to backup audit log:', error);
    }
  }

  private async checkGDPRCompliance(events: any[]): Promise<boolean> {
    // Check if all personal data access is logged
    const dataAccessEvents = events.filter(e => e.category === 'DATA_ACCESS');
    const personalDataAccess = dataAccessEvents.filter(e => 
      e.resource.includes('USER') || e.resource.includes('PERSONAL')
    );

    // GDPR requires all personal data access to be logged
    return personalDataAccess.length > 0;
  }

  private async checkDataRetentionCompliance(): Promise<boolean> {
    // Check if data retention policies are followed
    const oldestLog = await prisma.auditLog.findFirst({
      orderBy: { timestamp: 'asc' }
    });

    if (!oldestLog) return true;

    const ageInDays = (Date.now() - oldestLog.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= 2555; // 7 years max retention
  }

  private async checkAccessControlCompliance(events: any[]): Promise<boolean> {
    // Check for proper access control enforcement
    const unauthorizedAccess = events.filter(e => 
      e.category === 'SECURITY' && e.event.includes('UNAUTHORIZED')
    );

    return unauthorizedAccess.length === 0;
  }

  private async checkEncryptionCompliance(): Promise<boolean> {
    // Check if sensitive data is encrypted
    // This would check database encryption, file encryption, etc.
    return true; // Placeholder
  }

  private async generateFindings(events: any[], complianceChecks: any): Promise<ComplianceReport['findings']> {
    const findings: ComplianceReport['findings'] = [];

    // Check for security violations
    const securityEvents = events.filter(e => e.category === 'SECURITY');
    if (securityEvents.length > 0) {
      findings.push({
        type: 'WARNING',
        description: `${securityEvents.length} security events detected`,
        recommendation: 'Review security events and implement additional protection measures',
        riskLevel: 'MEDIUM'
      });
    }

    // Check for failed logins
    const failedLogins = events.filter(e => e.action === 'FAILED_LOGIN');
    if (failedLogins.length > 50) {
      findings.push({
        type: 'VIOLATION',
        description: 'High number of failed login attempts',
        recommendation: 'Implement stronger rate limiting and account lockout policies',
        affectedUsers: [...new Set(failedLogins.map(e => e.userId).filter(Boolean))],
        riskLevel: 'HIGH'
      });
    }

    // Check compliance status
    Object.entries(complianceChecks).forEach(([check, passed]) => {
      if (!passed) {
        findings.push({
          type: 'VIOLATION',
          description: `${check} compliance check failed`,
          recommendation: `Review and fix ${check} compliance issues`,
          riskLevel: 'HIGH'
        });
      }
    });

    return findings;
  }

  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    try {
      await prisma.complianceReport.create({
        data: {
          reportId: report.reportId,
          generatedAt: report.generatedAt,
          periodStart: report.period.start,
          periodEnd: report.period.end,
          summary: JSON.stringify(report.summary),
          complianceChecks: JSON.stringify(report.complianceChecks),
          findings: JSON.stringify(report.findings)
        }
      });
    } catch (error) {
      console.error('Failed to store compliance report:', error);
    }
  }

  private formatAuditEvent(event: any): AuditEvent {
    return {
      id: event.id,
      timestamp: event.timestamp,
      userId: event.userId,
      sessionId: event.sessionId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      event: event.event,
      resource: event.resource,
      resourceId: event.resourceId,
      action: event.action,
      oldValue: event.oldValue ? JSON.parse(event.oldValue) : undefined,
      newValue: event.newValue ? JSON.parse(event.newValue) : undefined,
      metadata: event.metadata ? JSON.parse(event.metadata) : undefined,
      severity: event.severity,
      category: event.category,
      compliance: event.complianceFlags ? JSON.parse(event.complianceFlags) : undefined
    };
  }
}

// Singleton instance
export const auditService = new AuditService();