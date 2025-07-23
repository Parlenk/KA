import React, { useState, useEffect } from 'react';
import { aiLearningService } from '../../services/aiLearningService';

interface ResizeFeedbackPanelProps {
  actionId: string | null;
  isVisible: boolean;
  onClose: () => void;
  onFeedbackSubmitted: () => void;
  resizeContext?: {
    strategy: string;
    confidence: number;
    reasoning: string;
  };
}

export default function ResizeFeedbackPanel({
  actionId,
  isVisible,
  onClose,
  onFeedbackSubmitted,
  resizeContext
}: ResizeFeedbackPanelProps) {
  const [feedback, setFeedback] = useState<'accept' | 'undo' | 'manual_adjust' | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setFeedback(null);
      setRating(0);
      setComment('');
    }
  }, [isVisible, actionId]);

  const handleSubmitFeedback = async () => {
    if (!actionId || !feedback) return;

    setIsSubmitting(true);

    try {
      // Record the feedback
      aiLearningService.recordUserFeedback(actionId, feedback);

      // Send feedback to backend for analysis
      await fetch('/api/v1/ai/resize-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionId,
          feedback,
          rating,
          comment,
          strategy: resizeContext?.strategy,
          confidence: resizeContext?.confidence
        })
      });

      onFeedbackSubmitted();
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible || !actionId) {
    return null;
  }

  const styles = {
    overlay: {
      position: 'fixed' as 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    panel: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '480px',
      width: '100%',
      margin: '20px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
    },
    header: {
      marginBottom: '20px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280'
    },
    aiInfo: {
      backgroundColor: '#f0f9ff',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #bae6fd'
    },
    aiInfoTitle: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#0369a1',
      marginBottom: '4px'
    },
    aiInfoText: {
      fontSize: '12px',
      color: '#0c4a6e'
    },
    section: {
      marginBottom: '20px'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '12px'
    },
    feedbackOptions: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '8px',
      marginBottom: '16px'
    },
    feedbackButton: {
      padding: '12px 8px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      textAlign: 'center' as 'center',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s',
      display: 'flex',
      flexDirection: 'column' as 'column',
      alignItems: 'center',
      gap: '4px'
    },
    feedbackButtonSelected: {
      borderColor: '#3b82f6',
      backgroundColor: '#eff6ff',
      color: '#1d4ed8'
    },
    feedbackIcon: {
      fontSize: '24px'
    },
    ratingContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px'
    },
    ratingStars: {
      display: 'flex',
      gap: '4px'
    },
    star: {
      fontSize: '20px',
      cursor: 'pointer',
      transition: 'color 0.2s'
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      resize: 'vertical' as 'vertical',
      minHeight: '80px'
    },
    actions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end'
    },
    button: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    buttonSecondary: {
      backgroundColor: '#f3f4f6',
      color: '#374151'
    },
    buttonPrimary: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  };

  const feedbackOptions = [
    {
      value: 'accept' as const,
      icon: '✅',
      label: 'Perfect!',
      description: 'Resize worked great'
    },
    {
      value: 'manual_adjust' as const,
      icon: '✏️',
      label: 'Needs tweaks',
      description: 'Good but I made adjustments'
    },
    {
      value: 'undo' as const,
      icon: '❌',
      label: 'Not good',
      description: 'Had to undo the resize'
    }
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>🤖 How was the AI Smart Resize?</h3>
          <p style={styles.subtitle}>Your feedback helps improve the AI for future resizes</p>
        </div>

        {resizeContext && (
          <div style={styles.aiInfo}>
            <div style={styles.aiInfoTitle}>AI Strategy Used</div>
            <div style={styles.aiInfoText}>
              {resizeContext.strategy.replace(/_/g, ' ').toUpperCase()} 
              (Confidence: {Math.round(resizeContext.confidence * 100)}%)
            </div>
            <div style={styles.aiInfoText}>{resizeContext.reasoning}</div>
          </div>
        )}

        <div style={styles.section}>
          <div style={styles.sectionTitle}>How did the resize work for you?</div>
          <div style={styles.feedbackOptions}>
            {feedbackOptions.map((option) => (
              <button
                key={option.value}
                style={{
                  ...styles.feedbackButton,
                  ...(feedback === option.value ? styles.feedbackButtonSelected : {})
                }}
                onClick={() => setFeedback(option.value)}
              >
                <div style={styles.feedbackIcon}>{option.icon}</div>
                <div>{option.label}</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Rate this resize (optional)</div>
          <div style={styles.ratingContainer}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>Rating:</span>
            <div style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  style={{
                    ...styles.star,
                    color: star <= rating ? '#fbbf24' : '#d1d5db'
                  }}
                  onClick={() => setRating(star)}
                >
                  ⭐
                </span>
              ))}
            </div>
            {rating > 0 && (
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                {rating}/5 stars
              </span>
            )}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Additional comments (optional)</div>
          <textarea
            style={styles.textarea}
            placeholder="Tell us what worked well or what could be improved..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <div style={styles.actions}>
          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Skip
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              ...((!feedback || isSubmitting) ? styles.buttonDisabled : {})
            }}
            onClick={handleSubmitFeedback}
            disabled={!feedback || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}