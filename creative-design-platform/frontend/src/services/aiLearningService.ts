/**
 * AI Learning Service for Smart Resize
 * Tracks user preferences and improves resize algorithms over time
 */

interface ResizeAction {
  id: string;
  userId: string;
  timestamp: Date;
  originalSize: { width: number; height: number };
  targetSize: { width: number; height: number };
  objectCount: number;
  objectTypes: string[];
  resizeStrategy: 'smart_rearrange' | 'intelligent_scaling' | 'emergency_repositioning';
  userFeedback?: 'accept' | 'undo' | 'manual_adjust';
  manualAdjustments?: ResizeAdjustment[];
  designCategory?: string;
  platformTarget?: string;
}

interface ResizeAdjustment {
  objectId: string;
  objectType: string;
  originalPosition: { x: number; y: number };
  userPosition: { x: number; y: number };
  originalSize: { width: number; height: number };
  userSize: { width: number; height: number };
  adjustmentType: 'position' | 'size' | 'both';
}

interface UserPreference {
  userId: string;
  preferredStrategy: 'preserve_layout' | 'maximize_content' | 'balanced';
  preferredPadding: number;
  objectPriorities: { [objectType: string]: number };
  platformPreferences: { [platform: string]: any };
  lastUpdated: Date;
}

interface LearningModel {
  version: string;
  confidence: number;
  patterns: ResizePattern[];
  userSegment: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  lastTrained: Date;
}

interface ResizePattern {
  conditions: {
    aspectRatioChange: 'landscape_to_portrait' | 'portrait_to_landscape' | 'same_orientation';
    sizeIncrease: boolean;
    objectCount: number;
    dominantObjectType: string;
  };
  preferredStrategy: string;
  confidence: number;
  successRate: number;
}

class AILearningService {
  private resizeHistory: ResizeAction[] = [];
  private userPreferences: { [userId: string]: UserPreference } = {};
  private learningModel: LearningModel | null = null;
  private pendingFeedback: { [actionId: string]: ResizeAction } = {};

  constructor() {
    this.loadStoredData();
    this.initializeLearningModel();
  }

  /**
   * Record a resize action for learning
   */
  recordResizeAction(action: Omit<ResizeAction, 'id' | 'timestamp'>): string {
    const resizeAction: ResizeAction = {
      ...action,
      id: `resize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.resizeHistory.push(resizeAction);
    this.pendingFeedback[resizeAction.id] = resizeAction;

    // Store in localStorage for persistence
    this.saveToStorage();

    console.log('🤖 AI Learning: Recorded resize action', resizeAction);
    return resizeAction.id;
  }

  /**
   * Record user feedback on a resize action
   */
  recordUserFeedback(actionId: string, feedback: 'accept' | 'undo' | 'manual_adjust', adjustments?: ResizeAdjustment[]) {
    const action = this.pendingFeedback[actionId];
    if (!action) {
      console.warn('AI Learning: Action not found for feedback', actionId);
      return;
    }

    action.userFeedback = feedback;
    if (adjustments) {
      action.manualAdjustments = adjustments;
    }

    // Update the action in history
    const historyIndex = this.resizeHistory.findIndex(a => a.id === actionId);
    if (historyIndex !== -1) {
      this.resizeHistory[historyIndex] = action;
    }

    // Remove from pending feedback
    delete this.pendingFeedback[actionId];

    // Update user preferences based on feedback
    this.updateUserPreferences(action);

    // Retrain model if we have enough data
    if (this.resizeHistory.length % 10 === 0) {
      this.retrainModel();
    }

    this.saveToStorage();
    console.log('🤖 AI Learning: Recorded user feedback', { actionId, feedback, adjustments });
  }

  /**
   * Get recommended resize strategy based on learned preferences
   */
  getRecommendedStrategy(context: {
    userId: string;
    originalSize: { width: number; height: number };
    targetSize: { width: number; height: number };
    objectCount: number;
    objectTypes: string[];
    designCategory?: string;
    platformTarget?: string;
  }): {
    strategy: 'smart_rearrange' | 'intelligent_scaling' | 'emergency_repositioning';
    confidence: number;
    reasoning: string;
    suggestedPadding: number;
  } {
    const userPrefs = this.userPreferences[context.userId];
    const model = this.learningModel;

    // Calculate aspect ratio change
    const originalAspectRatio = context.originalSize.width / context.originalSize.height;
    const targetAspectRatio = context.targetSize.width / context.targetSize.height;
    
    const orientationChange = this.getOrientationChange(originalAspectRatio, targetAspectRatio);
    const sizeIncrease = (context.targetSize.width * context.targetSize.height) > 
                        (context.originalSize.width * context.originalSize.height);

    // Find matching patterns
    let bestPattern: ResizePattern | null = null;
    let maxConfidence = 0;

    if (model) {
      for (const pattern of model.patterns) {
        if (this.patternMatches(pattern.conditions, {
          aspectRatioChange: orientationChange,
          sizeIncrease,
          objectCount: context.objectCount,
          dominantObjectType: this.getDominantObjectType(context.objectTypes)
        })) {
          if (pattern.confidence > maxConfidence) {
            bestPattern = pattern;
            maxConfidence = pattern.confidence;
          }
        }
      }
    }

    // Default strategy based on user preferences or best pattern
    let strategy: 'smart_rearrange' | 'intelligent_scaling' | 'emergency_repositioning' = 'intelligent_scaling';
    let confidence = 0.5;
    let reasoning = 'Default strategy - no specific pattern found';
    let suggestedPadding = 20;

    if (bestPattern) {
      strategy = bestPattern.preferredStrategy as any;
      confidence = bestPattern.confidence;
      reasoning = `Pattern-based recommendation (${bestPattern.successRate * 100}% success rate)`;
    } else if (userPrefs) {
      // Use user preferences
      if (userPrefs.preferredStrategy === 'preserve_layout' && orientationChange === 'same_orientation') {
        strategy = 'smart_rearrange';
        confidence = 0.7;
        reasoning = 'User prefers layout preservation for same orientation';
      } else if (userPrefs.preferredStrategy === 'maximize_content') {
        strategy = 'intelligent_scaling';
        confidence = 0.7;
        reasoning = 'User prefers content maximization';
      }
      
      suggestedPadding = userPrefs.preferredPadding;
    }

    // Override for specific conditions
    if (context.objectCount > 10) {
      strategy = 'intelligent_scaling';
      confidence = Math.min(confidence + 0.2, 0.9);
      reasoning += ' (Many objects - scaling preferred)';
    }

    if (orientationChange !== 'same_orientation' && context.objectCount <= 5) {
      strategy = 'smart_rearrange';
      confidence = Math.min(confidence + 0.1, 0.9);
      reasoning += ' (Orientation change with few objects - rearrangement preferred)';
    }

    console.log('🤖 AI Learning: Strategy recommendation', {
      strategy,
      confidence,
      reasoning,
      suggestedPadding,
      context
    });

    return { strategy, confidence, reasoning, suggestedPadding };
  }

  /**
   * Update user preferences based on feedback
   */
  private updateUserPreferences(action: ResizeAction) {
    if (!this.userPreferences[action.userId]) {
      this.userPreferences[action.userId] = {
        userId: action.userId,
        preferredStrategy: 'balanced',
        preferredPadding: 20,
        objectPriorities: {},
        platformPreferences: {},
        lastUpdated: new Date()
      };
    }

    const prefs = this.userPreferences[action.userId];

    // Update strategy preference based on feedback
    if (action.userFeedback === 'accept') {
      // Positive feedback - strengthen this strategy
      if (action.resizeStrategy === 'smart_rearrange') {
        prefs.preferredStrategy = 'preserve_layout';
      } else if (action.resizeStrategy === 'intelligent_scaling') {
        prefs.preferredStrategy = 'maximize_content';
      }
    } else if (action.userFeedback === 'manual_adjust' && action.manualAdjustments) {
      // Analyze manual adjustments to understand preferences
      this.analyzeManualAdjustments(prefs, action.manualAdjustments);
    }

    // Update object priorities based on what user focuses on
    for (const objectType of action.objectTypes) {
      if (!prefs.objectPriorities[objectType]) {
        prefs.objectPriorities[objectType] = 1;
      }
      
      if (action.userFeedback === 'accept') {
        prefs.objectPriorities[objectType] += 0.1;
      } else if (action.userFeedback === 'undo') {
        prefs.objectPriorities[objectType] -= 0.1;
      }
    }

    prefs.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Analyze manual adjustments to understand user preferences
   */
  private analyzeManualAdjustments(prefs: UserPreference, adjustments: ResizeAdjustment[]) {
    let totalPaddingX = 0;
    let totalPaddingY = 0;
    let paddingCount = 0;

    for (const adj of adjustments) {
      // Analyze padding preferences
      if (adj.adjustmentType === 'position' || adj.adjustmentType === 'both') {
        totalPaddingX += Math.abs(adj.userPosition.x - adj.originalPosition.x);
        totalPaddingY += Math.abs(adj.userPosition.y - adj.originalPosition.y);
        paddingCount++;
      }

      // Update object priorities based on what user manually adjusted
      if (!prefs.objectPriorities[adj.objectType]) {
        prefs.objectPriorities[adj.objectType] = 1;
      }
      prefs.objectPriorities[adj.objectType] += 0.2; // Higher priority for manually adjusted objects
    }

    if (paddingCount > 0) {
      const avgPadding = (totalPaddingX + totalPaddingY) / (paddingCount * 2);
      prefs.preferredPadding = Math.max(10, Math.min(50, avgPadding));
    }
  }

  /**
   * Retrain the learning model with new data
   */
  private retrainModel() {
    if (this.resizeHistory.length < 5) return;

    console.log('🤖 AI Learning: Retraining model with', this.resizeHistory.length, 'actions');

    const patterns: ResizePattern[] = [];
    const groupedActions = this.groupActionsByPattern();

    for (const [patternKey, actions] of Object.entries(groupedActions)) {
      const successfulActions = actions.filter(a => a.userFeedback === 'accept');
      const successRate = successfulActions.length / actions.length;
      
      if (actions.length >= 2) { // Only create patterns with enough data
        const [orientationChange, sizeIncrease, objectCount, dominantType] = patternKey.split('|');
        
        patterns.push({
          conditions: {
            aspectRatioChange: orientationChange as any,
            sizeIncrease: sizeIncrease === 'true',
            objectCount: parseInt(objectCount),
            dominantObjectType: dominantType
          },
          preferredStrategy: this.getMostSuccessfulStrategy(successfulActions),
          confidence: Math.min(0.9, successRate + (actions.length * 0.05)),
          successRate
        });
      }
    }

    this.learningModel = {
      version: `v${Date.now()}`,
      confidence: patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length : 0.5,
      patterns,
      userSegment: this.determineUserSegment(),
      lastTrained: new Date()
    };

    this.saveToStorage();
    console.log('🤖 AI Learning: Model retrained with', patterns.length, 'patterns');
  }

  /**
   * Group actions by pattern for analysis
   */
  private groupActionsByPattern(): { [key: string]: ResizeAction[] } {
    const groups: { [key: string]: ResizeAction[] } = {};

    for (const action of this.resizeHistory) {
      if (!action.userFeedback) continue;

      const originalAspectRatio = action.originalSize.width / action.originalSize.height;
      const targetAspectRatio = action.targetSize.width / action.targetSize.height;
      const orientationChange = this.getOrientationChange(originalAspectRatio, targetAspectRatio);
      const sizeIncrease = (action.targetSize.width * action.targetSize.height) > 
                          (action.originalSize.width * action.originalSize.height);
      const dominantType = this.getDominantObjectType(action.objectTypes);

      const patternKey = `${orientationChange}|${sizeIncrease}|${action.objectCount}|${dominantType}`;
      
      if (!groups[patternKey]) {
        groups[patternKey] = [];
      }
      groups[patternKey].push(action);
    }

    return groups;
  }

  /**
   * Get the most successful strategy from a group of actions
   */
  private getMostSuccessfulStrategy(actions: ResizeAction[]): string {
    const strategyCounts: { [strategy: string]: number } = {};
    
    for (const action of actions) {
      strategyCounts[action.resizeStrategy] = (strategyCounts[action.resizeStrategy] || 0) + 1;
    }

    return Object.keys(strategyCounts).reduce((a, b) => 
      strategyCounts[a] > strategyCounts[b] ? a : b
    );
  }

  /**
   * Determine user skill segment based on behavior
   */
  private determineUserSegment(): 'beginner' | 'intermediate' | 'advanced' | 'professional' {
    const totalActions = this.resizeHistory.length;
    const acceptanceRate = this.resizeHistory.filter(a => a.userFeedback === 'accept').length / totalActions;
    const manualAdjustmentRate = this.resizeHistory.filter(a => a.userFeedback === 'manual_adjust').length / totalActions;

    if (totalActions < 5) return 'beginner';
    if (acceptanceRate > 0.8) return 'professional';
    if (acceptanceRate > 0.6 && manualAdjustmentRate < 0.3) return 'advanced';
    if (acceptanceRate > 0.4) return 'intermediate';
    return 'beginner';
  }

  /**
   * Helper methods
   */
  private getOrientationChange(originalAspectRatio: number, targetAspectRatio: number): 'landscape_to_portrait' | 'portrait_to_landscape' | 'same_orientation' {
    const wasLandscape = originalAspectRatio > 1;
    const isLandscape = targetAspectRatio > 1;

    if (wasLandscape && !isLandscape) return 'landscape_to_portrait';
    if (!wasLandscape && isLandscape) return 'portrait_to_landscape';
    return 'same_orientation';
  }

  private getDominantObjectType(objectTypes: string[]): string {
    const counts: { [type: string]: number } = {};
    for (const type of objectTypes) {
      counts[type] = (counts[type] || 0) + 1;
    }
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  private patternMatches(conditions: any, context: any): boolean {
    return conditions.aspectRatioChange === context.aspectRatioChange &&
           conditions.sizeIncrease === context.sizeIncrease &&
           Math.abs(conditions.objectCount - context.objectCount) <= 2 &&
           conditions.dominantObjectType === context.dominantObjectType;
  }

  private initializeLearningModel() {
    if (!this.learningModel) {
      this.learningModel = {
        version: 'v1.0.0',
        confidence: 0.5,
        patterns: [],
        userSegment: 'beginner',
        lastTrained: new Date()
      };
    }
  }

  private loadStoredData() {
    try {
      const stored = localStorage.getItem('aiLearningData');
      if (stored) {
        const data = JSON.parse(stored);
        this.resizeHistory = data.resizeHistory || [];
        this.userPreferences = data.userPreferences || {};
        this.learningModel = data.learningModel || null;
      }
    } catch (error) {
      console.warn('AI Learning: Failed to load stored data', error);
    }
  }

  private saveToStorage() {
    try {
      const data = {
        resizeHistory: this.resizeHistory,
        userPreferences: this.userPreferences,
        learningModel: this.learningModel
      };
      localStorage.setItem('aiLearningData', JSON.stringify(data));
    } catch (error) {
      console.warn('AI Learning: Failed to save data', error);
    }
  }

  /**
   * Get user insights for dashboard
   */
  getUserInsights(userId: string) {
    const prefs = this.userPreferences[userId];
    const userActions = this.resizeHistory.filter(a => a.userId === userId);
    
    if (!prefs || userActions.length === 0) {
      return null;
    }

    const acceptanceRate = userActions.filter(a => a.userFeedback === 'accept').length / userActions.length;
    const mostUsedStrategy = this.getMostSuccessfulStrategy(userActions);
    
    return {
      segment: this.learningModel?.userSegment || 'beginner',
      acceptanceRate,
      totalResizes: userActions.length,
      preferredStrategy: prefs.preferredStrategy,
      preferredPadding: prefs.preferredPadding,
      mostUsedStrategy,
      objectPriorities: prefs.objectPriorities
    };
  }

  /**
   * Export user data for analysis
   */
  exportUserData(userId: string) {
    return {
      preferences: this.userPreferences[userId],
      actions: this.resizeHistory.filter(a => a.userId === userId),
      model: this.learningModel
    };
  }
}

// Create singleton instance
export const aiLearningService = new AILearningService();