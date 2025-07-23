/**
 * Beta Testing Program Management
 * User feedback collection, bug reporting, and feature validation
 */

export interface BetaUser {
  id: string;
  email: string;
  name: string;
  role: 'designer' | 'marketer' | 'developer' | 'business_owner' | 'other';
  experience: 'beginner' | 'intermediate' | 'expert';
  company?: string;
  useCase: string;
  joinedAt: Date;
  lastActiveAt: Date;
  feedbackCount: number;
  bugsReported: number;
  featuresRequested: number;
  engagementScore: number;
}

export interface Feedback {
  id: string;
  userId: string;
  type: 'bug' | 'feature_request' | 'improvement' | 'praise' | 'general';
  category: 'ui_ux' | 'performance' | 'functionality' | 'accessibility' | 'integration' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
  attachments: string[];
  screenshots: string[];
  browserInfo: BrowserInfo;
  sessionData: SessionData;
  createdAt: Date;
  updatedAt: Date;
  votes: number;
  comments: FeedbackComment[];
}

export interface BrowserInfo {
  userAgent: string;
  browser: string;
  version: string;
  os: string;
  viewport: { width: number; height: number };
  colorDepth: number;
  pixelRatio: number;
}

export interface SessionData {
  sessionId: string;
  duration: number;
  pagesVisited: string[];
  actionsPerformed: string[];
  errors: string[];
  performanceMetrics: any;
}

export interface FeedbackComment {
  id: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface BetaMetrics {
  totalUsers: number;
  activeUsers: number;
  retentionRate: number;
  averageSessionTime: number;
  featuresUsed: Map<string, number>;
  commonIssues: Array<{ issue: string; count: number }>;
  userSatisfaction: number;
  npsScore: number;
}

export class BetaProgramManager {
  private apiBaseUrl: string;
  private feedbackWidget: HTMLElement | null = null;
  private sessionData: SessionData;

  constructor(apiBaseUrl: string = '/api/v1/beta') {
    this.apiBaseUrl = apiBaseUrl;
    this.sessionData = this.initializeSession();
    this.setupFeedbackCollection();
  }

  private initializeSession(): SessionData {
    const sessionId = this.generateSessionId();
    
    return {
      sessionId,
      duration: 0,
      pagesVisited: [window.location.pathname],
      actionsPerformed: [],
      errors: [],
      performanceMetrics: {}
    };
  }

  private generateSessionId(): string {
    return `beta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupFeedbackCollection(): void {
    // Track page navigation
    this.trackPageNavigation();
    
    // Track user actions
    this.trackUserActions();
    
    // Track errors
    this.trackErrors();
    
    // Create feedback widget
    this.createFeedbackWidget();
    
    // Track session duration
    this.trackSessionDuration();
  }

  private trackPageNavigation(): void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      this.sessionData.pagesVisited.push(args[2] as string);
      originalPushState.apply(history, args);
    };
    
    history.replaceState = (...args) => {
      this.sessionData.pagesVisited.push(args[2] as string);
      originalReplaceState.apply(history, args);
    };
    
    window.addEventListener('popstate', () => {
      this.sessionData.pagesVisited.push(window.location.pathname);
    });
  }

  private trackUserActions(): void {
    const actionEvents = ['click', 'keydown', 'scroll', 'resize'];
    
    actionEvents.forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        const action = this.serializeAction(event);
        this.sessionData.actionsPerformed.push(action);
        
        // Keep only last 100 actions
        if (this.sessionData.actionsPerformed.length > 100) {
          this.sessionData.actionsPerformed.shift();
        }
      });
    });
  }

  private serializeAction(event: Event): string {
    const target = event.target as HTMLElement;
    const timestamp = Date.now();
    
    return JSON.stringify({
      type: event.type,
      timestamp,
      target: {
        tagName: target.tagName,
        id: target.id,
        className: target.className,
        textContent: target.textContent?.slice(0, 50)
      },
      page: window.location.pathname
    });
  }

  private trackErrors(): void {
    window.addEventListener('error', (event) => {
      this.sessionData.errors.push(JSON.stringify({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now()
      }));
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.sessionData.errors.push(JSON.stringify({
        reason: event.reason?.toString(),
        timestamp: Date.now(),
        type: 'unhandled_promise_rejection'
      }));
    });
  }

  private trackSessionDuration(): void {
    const startTime = Date.now();
    
    const updateDuration = () => {
      this.sessionData.duration = Date.now() - startTime;
    };
    
    setInterval(updateDuration, 30000); // Update every 30 seconds
    
    window.addEventListener('beforeunload', () => {
      updateDuration();
      this.submitSessionData();
    });
  }

  private createFeedbackWidget(): void {
    this.feedbackWidget = document.createElement('div');
    this.feedbackWidget.id = 'beta-feedback-widget';
    this.feedbackWidget.innerHTML = `
      <div class="feedback-widget">
        <button class="feedback-trigger" id="feedback-trigger">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Feedback</span>
        </button>
        
        <div class="feedback-panel" id="feedback-panel" style="display: none;">
          <div class="feedback-header">
            <h3>Beta Feedback</h3>
            <button class="feedback-close" id="feedback-close">&times;</button>
          </div>
          
          <div class="feedback-content">
            <div class="feedback-type-selector">
              <label>
                <input type="radio" name="feedback-type" value="bug" checked>
                🐛 Bug Report
              </label>
              <label>
                <input type="radio" name="feedback-type" value="feature_request">
                💡 Feature Request
              </label>
              <label>
                <input type="radio" name="feedback-type" value="improvement">
                ⚡ Improvement
              </label>
              <label>
                <input type="radio" name="feedback-type" value="praise">
                👏 Praise
              </label>
            </div>
            
            <input type="text" id="feedback-title" placeholder="Brief title...">
            <textarea id="feedback-description" placeholder="Describe your feedback in detail..."></textarea>
            
            <div class="feedback-actions">
              <button id="take-screenshot">📸 Take Screenshot</button>
              <button id="submit-feedback" class="primary">Submit Feedback</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
      .feedback-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .feedback-trigger {
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 25px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        transition: all 0.2s;
      }
      
      .feedback-trigger:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
      }
      
      .feedback-panel {
        position: absolute;
        bottom: 60px;
        right: 0;
        width: 320px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        border: 1px solid #e5e7eb;
      }
      
      .feedback-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .feedback-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .feedback-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #6b7280;
      }
      
      .feedback-content {
        padding: 20px;
      }
      
      .feedback-type-selector {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 16px;
      }
      
      .feedback-type-selector label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        cursor: pointer;
      }
      
      #feedback-title {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        margin-bottom: 12px;
        font-size: 14px;
      }
      
      #feedback-description {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 14px;
        resize: vertical;
        min-height: 80px;
      }
      
      .feedback-actions {
        display: flex;
        gap: 12px;
      }
      
      .feedback-actions button {
        padding: 10px 16px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 14px;
      }
      
      .feedback-actions button.primary {
        background: #2563eb;
        color: white;
        border-color: #2563eb;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(this.feedbackWidget);
    
    this.setupFeedbackWidgetEvents();
  }

  private setupFeedbackWidgetEvents(): void {
    const trigger = document.getElementById('feedback-trigger');
    const panel = document.getElementById('feedback-panel');
    const close = document.getElementById('feedback-close');
    const submit = document.getElementById('submit-feedback');
    const screenshot = document.getElementById('take-screenshot');
    
    trigger?.addEventListener('click', () => {
      panel!.style.display = panel!.style.display === 'none' ? 'block' : 'none';
    });
    
    close?.addEventListener('click', () => {
      panel!.style.display = 'none';
    });
    
    submit?.addEventListener('click', () => {
      this.submitFeedback();
    });
    
    screenshot?.addEventListener('click', () => {
      this.takeScreenshot();
    });
  }

  private async submitFeedback(): Promise<void> {
    const typeElement = document.querySelector('input[name="feedback-type"]:checked') as HTMLInputElement;
    const titleElement = document.getElementById('feedback-title') as HTMLInputElement;
    const descriptionElement = document.getElementById('feedback-description') as HTMLTextAreaElement;
    
    if (!titleElement.value.trim() || !descriptionElement.value.trim()) {
      alert('Please fill in both title and description');
      return;
    }
    
    const feedback: Partial<Feedback> = {
      type: typeElement.value as any,
      title: titleElement.value.trim(),
      description: descriptionElement.value.trim(),
      browserInfo: this.getBrowserInfo(),
      sessionData: this.sessionData,
      priority: 'medium',
      category: 'general'
    };
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(feedback)
      });
      
      if (response.ok) {
        // Show success message
        this.showSuccessMessage('Thank you for your feedback!');
        
        // Clear form
        titleElement.value = '';
        descriptionElement.value = '';
        
        // Close panel
        const panel = document.getElementById('feedback-panel');
        panel!.style.display = 'none';
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      alert('Failed to submit feedback. Please try again.');
      console.error('Feedback submission error:', error);
    }
  }

  private getBrowserInfo(): BrowserInfo {
    const ua = navigator.userAgent;
    
    return {
      userAgent: ua,
      browser: this.detectBrowser(ua),
      version: this.detectBrowserVersion(ua),
      os: this.detectOS(ua),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio
    };
  }

  private detectBrowser(ua: string): string {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private detectBrowserVersion(ua: string): string {
    const match = ua.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+\.\d+)/);
    return match ? match[1] : 'Unknown';
  }

  private detectOS(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('iOS')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    return 'Unknown';
  }

  private async takeScreenshot(): Promise<void> {
    try {
      // Use html2canvas or similar library to capture screenshot
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // For demo purposes, create a placeholder
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      if (ctx) {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#374151';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Screenshot captured', canvas.width / 2, canvas.height / 2);
      }
      
      const dataUrl = canvas.toDataURL('image/png');
      
      // Store screenshot for submission
      (window as any).currentScreenshot = dataUrl;
      
      this.showSuccessMessage('Screenshot captured!');
    } catch (error) {
      console.error('Screenshot error:', error);
      alert('Failed to capture screenshot');
    }
  }

  private showSuccessMessage(message: string): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10001;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  private async submitSessionData(): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(this.sessionData)
      });
    } catch (error) {
      console.error('Session data submission error:', error);
    }
  }

  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }

  /**
   * Public API methods
   */

  public async getBetaMetrics(): Promise<BetaMetrics> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/metrics`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch beta metrics');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Beta metrics error:', error);
      throw error;
    }
  }

  public async getAllFeedback(filters?: {
    type?: string;
    status?: string;
    priority?: string;
  }): Promise<Feedback[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });
      }
      
      const response = await fetch(`${this.apiBaseUrl}/feedback?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Feedback fetch error:', error);
      throw error;
    }
  }

  public async updateFeedbackStatus(feedbackId: string, status: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update feedback status');
      }
    } catch (error) {
      console.error('Feedback update error:', error);
      throw error;
    }
  }

  public trackFeatureUsage(feature: string, metadata?: any): void {
    const action = JSON.stringify({
      type: 'feature_usage',
      feature,
      metadata,
      timestamp: Date.now(),
      page: window.location.pathname
    });
    
    this.sessionData.actionsPerformed.push(action);
  }

  public async generateBetaReport(): Promise<{
    summary: BetaMetrics;
    topIssues: Feedback[];
    userEngagement: any;
    featureAdoption: any;
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/report`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate beta report');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Beta report error:', error);
      throw error;
    }
  }
}

// Global instance
export const betaProgramManager = new BetaProgramManager();