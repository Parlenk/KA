const express = require('express');
const router = express.Router();

// In-memory storage for AI learning data (in production, use database)
let resizeActions = [];
let userPreferences = {};
let learningModel = {
  version: '1.0.0',
  confidence: 0.5,
  patterns: [],
  lastTrained: new Date()
};

// Store resize feedback
router.post('/resize-feedback', (req, res) => {
  try {
    const { actionId, feedback, rating, comment, strategy, confidence } = req.body;
    
    console.log('📊 AI Learning: Received resize feedback', {
      actionId,
      feedback,
      rating,
      strategy,
      confidence
    });

    // Find the resize action
    const actionIndex = resizeActions.findIndex(action => action.id === actionId);
    
    if (actionIndex !== -1) {
      // Update the action with feedback
      resizeActions[actionIndex] = {
        ...resizeActions[actionIndex],
        userFeedback: feedback,
        rating,
        comment,
        feedbackTimestamp: new Date()
      };

      // Update learning statistics
      updateLearningModel(resizeActions[actionIndex]);

      res.json({
        success: true,
        message: 'Feedback recorded successfully',
        learningStats: getLearningStats()
      });
    } else {
      // Create new action record if not found
      const newAction = {
        id: actionId,
        userFeedback: feedback,
        rating,
        comment,
        strategy,
        confidence,
        timestamp: new Date(),
        feedbackTimestamp: new Date()
      };
      
      resizeActions.push(newAction);
      updateLearningModel(newAction);

      res.json({
        success: true,
        message: 'Feedback recorded successfully (new record)',
        learningStats: getLearningStats()
      });
    }
  } catch (error) {
    console.error('AI Learning: Error recording feedback', error);
    res.status(500).json({
      error: 'Failed to record feedback',
      message: error.message
    });
  }
});

// Get learning insights for a user
router.get('/insights/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const userActions = resizeActions.filter(action => action.userId === userId);
    const userPrefs = userPreferences[userId] || {};

    if (userActions.length === 0) {
      return res.json({
        message: 'No resize history found for user',
        insights: null
      });
    }

    const insights = {
      totalResizes: userActions.length,
      acceptanceRate: calculateAcceptanceRate(userActions),
      preferredStrategy: getMostSuccessfulStrategy(userActions),
      averageRating: calculateAverageRating(userActions),
      preferences: userPrefs,
      recentActivity: userActions.slice(-10),
      improvements: generateImprovementSuggestions(userActions)
    };

    res.json({
      success: true,
      insights
    });
  } catch (error) {
    console.error('AI Learning: Error getting insights', error);
    res.status(500).json({
      error: 'Failed to get insights',
      message: error.message
    });
  }
});

// Get overall learning model statistics
router.get('/stats', (req, res) => {
  try {
    const stats = {
      model: learningModel,
      totalActions: resizeActions.length,
      feedbackActions: resizeActions.filter(a => a.userFeedback).length,
      strategyStats: getStrategyStatistics(),
      userCount: Object.keys(userPreferences).length,
      averageConfidence: calculateAverageConfidence(),
      topPatterns: getTopPatterns()
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('AI Learning: Error getting stats', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

// Export user learning data
router.get('/export/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const userData = {
      userId,
      preferences: userPreferences[userId] || {},
      actions: resizeActions.filter(action => action.userId === userId),
      exportedAt: new Date(),
      modelVersion: learningModel.version
    };

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('AI Learning: Error exporting data', error);
    res.status(500).json({
      error: 'Failed to export data',
      message: error.message
    });
  }
});

// Reset learning data for a user (for testing)
router.delete('/reset/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Remove user's actions
    resizeActions = resizeActions.filter(action => action.userId !== userId);
    
    // Remove user's preferences
    delete userPreferences[userId];
    
    console.log(`🗑️ AI Learning: Reset data for user ${userId}`);
    
    res.json({
      success: true,
      message: `Learning data reset for user ${userId}`
    });
  } catch (error) {
    console.error('AI Learning: Error resetting data', error);
    res.status(500).json({
      error: 'Failed to reset data',
      message: error.message
    });
  }
});

// Helper functions
function updateLearningModel(action) {
  // Update model based on new feedback
  if (action.userFeedback) {
    const strategyIndex = learningModel.patterns.findIndex(p => p.strategy === action.strategy);
    
    if (strategyIndex !== -1) {
      // Update existing pattern
      const pattern = learningModel.patterns[strategyIndex];
      pattern.totalUses++;
      
      if (action.userFeedback === 'accept') {
        pattern.successCount++;
      }
      
      pattern.successRate = pattern.successCount / pattern.totalUses;
      pattern.confidence = Math.min(0.95, pattern.successRate + (pattern.totalUses * 0.01));
    } else {
      // Create new pattern
      learningModel.patterns.push({
        strategy: action.strategy,
        totalUses: 1,
        successCount: action.userFeedback === 'accept' ? 1 : 0,
        successRate: action.userFeedback === 'accept' ? 1 : 0,
        confidence: 0.5,
        firstSeen: new Date()
      });
    }
    
    // Update overall model confidence
    const totalSuccess = learningModel.patterns.reduce((sum, p) => sum + p.successCount, 0);
    const totalUses = learningModel.patterns.reduce((sum, p) => sum + p.totalUses, 0);
    learningModel.confidence = totalUses > 0 ? totalSuccess / totalUses : 0.5;
    learningModel.lastTrained = new Date();
  }
}

function calculateAcceptanceRate(actions) {
  const actionsWithFeedback = actions.filter(a => a.userFeedback);
  if (actionsWithFeedback.length === 0) return 0;
  
  const acceptedActions = actionsWithFeedback.filter(a => a.userFeedback === 'accept');
  return acceptedActions.length / actionsWithFeedback.length;
}

function getMostSuccessfulStrategy(actions) {
  const strategyCounts = {};
  const strategySuccess = {};
  
  actions.forEach(action => {
    if (action.strategy && action.userFeedback) {
      strategyCounts[action.strategy] = (strategyCounts[action.strategy] || 0) + 1;
      
      if (action.userFeedback === 'accept') {
        strategySuccess[action.strategy] = (strategySuccess[action.strategy] || 0) + 1;
      }
    }
  });
  
  let bestStrategy = null;
  let bestScore = 0;
  
  Object.keys(strategyCounts).forEach(strategy => {
    const successRate = (strategySuccess[strategy] || 0) / strategyCounts[strategy];
    const score = successRate * strategyCounts[strategy]; // Weight by usage
    
    if (score > bestScore) {
      bestScore = score;
      bestStrategy = strategy;
    }
  });
  
  return bestStrategy;
}

function calculateAverageRating(actions) {
  const ratedActions = actions.filter(a => a.rating && a.rating > 0);
  if (ratedActions.length === 0) return 0;
  
  const totalRating = ratedActions.reduce((sum, a) => sum + a.rating, 0);
  return totalRating / ratedActions.length;
}

function generateImprovementSuggestions(actions) {
  const suggestions = [];
  
  const recentActions = actions.slice(-5);
  const recentAcceptanceRate = calculateAcceptanceRate(recentActions);
  
  if (recentAcceptanceRate < 0.6) {
    suggestions.push({
      type: 'strategy',
      message: 'Consider trying different resize strategies for better results',
      priority: 'high'
    });
  }
  
  const undoActions = actions.filter(a => a.userFeedback === 'undo');
  if (undoActions.length > actions.length * 0.3) {
    suggestions.push({
      type: 'preference',
      message: 'AI may benefit from learning your specific design preferences',
      priority: 'medium'
    });
  }
  
  const ratedActions = actions.filter(a => a.rating);
  if (ratedActions.length < actions.length * 0.2) {
    suggestions.push({
      type: 'feedback',
      message: 'Providing ratings helps improve AI recommendations',
      priority: 'low'
    });
  }
  
  return suggestions;
}

function getLearningStats() {
  return {
    totalActions: resizeActions.length,
    modelConfidence: learningModel.confidence,
    patternsLearned: learningModel.patterns.length,
    lastUpdate: learningModel.lastTrained
  };
}

function getStrategyStatistics() {
  const stats = {};
  
  resizeActions.forEach(action => {
    if (action.strategy) {
      if (!stats[action.strategy]) {
        stats[action.strategy] = {
          total: 0,
          accepted: 0,
          undone: 0,
          manualAdjusted: 0,
          averageRating: 0
        };
      }
      
      stats[action.strategy].total++;
      
      if (action.userFeedback === 'accept') {
        stats[action.strategy].accepted++;
      } else if (action.userFeedback === 'undo') {
        stats[action.strategy].undone++;
      } else if (action.userFeedback === 'manual_adjust') {
        stats[action.strategy].manualAdjusted++;
      }
      
      if (action.rating) {
        stats[action.strategy].averageRating = 
          (stats[action.strategy].averageRating + action.rating) / 2;
      }
    }
  });
  
  // Calculate success rates
  Object.keys(stats).forEach(strategy => {
    const stat = stats[strategy];
    stat.successRate = stat.total > 0 ? stat.accepted / stat.total : 0;
  });
  
  return stats;
}

function calculateAverageConfidence() {
  if (learningModel.patterns.length === 0) return 0.5;
  
  const totalConfidence = learningModel.patterns.reduce((sum, p) => sum + p.confidence, 0);
  return totalConfidence / learningModel.patterns.length;
}

function getTopPatterns() {
  return learningModel.patterns
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5)
    .map(pattern => ({
      strategy: pattern.strategy,
      successRate: pattern.successRate,
      totalUses: pattern.totalUses,
      confidence: pattern.confidence
    }));
}

module.exports = router;