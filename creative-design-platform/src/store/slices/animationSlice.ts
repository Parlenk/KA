// Animation timeline management slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnimationTimeline, AnimationKeyframe, ANIMATION_PRESETS } from '../../types/design';

interface AnimationState {
  timelines: Record<string, AnimationTimeline>; // objectId -> timeline
  selectedTimelineId: string | null;
  currentTime: number; // current playback position in milliseconds
  isPlaying: boolean;
  duration: number; // total timeline duration
  frameRate: number; // frames per second
  presets: typeof ANIMATION_PRESETS;
  loading: boolean;
  error: string | null;
}

const initialState: AnimationState = {
  timelines: {},
  selectedTimelineId: null,
  currentTime: 0,
  isPlaying: false,
  duration: 5000, // 5 seconds default
  frameRate: 30,
  presets: ANIMATION_PRESETS,
  loading: false,
  error: null,
};

// Async thunks
export const saveAnimations = createAsyncThunk(
  'animation/saveAnimations',
  async (params: { designSetId: string; animations: AnimationTimeline[] }) => {
    const response = await fetch(`/api/design-sets/${params.designSetId}/animations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animations: params.animations }),
    });
    return response.json();
  }
);

export const generateMagicAnimation = createAsyncThunk(
  'animation/generateMagicAnimation',
  async (params: { objectIds: string[]; style: string; duration?: number }) => {
    const response = await fetch('/api/animations/magic-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

const animationSlice = createSlice({
  name: 'animation',
  initialState,
  reducers: {
    // Timeline Management
    createTimeline: (state, action: PayloadAction<{ objectId: string; duration?: number }>) => {
      const timeline: AnimationTimeline = {
        id: `timeline_${Date.now()}`,
        objectId: action.payload.objectId,
        duration: action.payload.duration || state.duration,
        keyframes: [],
        loop: false,
        delay: 0,
      };
      state.timelines[action.payload.objectId] = timeline;
    },

    deleteTimeline: (state, action: PayloadAction<string>) => {
      delete state.timelines[action.payload];
      if (state.selectedTimelineId === action.payload) {
        state.selectedTimelineId = null;
      }
    },

    selectTimeline: (state, action: PayloadAction<string | null>) => {
      state.selectedTimelineId = action.payload;
    },

    updateTimelineDuration: (state, action: PayloadAction<{ objectId: string; duration: number }>) => {
      const timeline = state.timelines[action.payload.objectId];
      if (timeline) {
        timeline.duration = action.payload.duration;
        // Remove keyframes that exceed new duration
        timeline.keyframes = timeline.keyframes.filter(kf => kf.time <= action.payload.duration);
      }
    },

    setTimelineLoop: (state, action: PayloadAction<{ objectId: string; loop: boolean }>) => {
      const timeline = state.timelines[action.payload.objectId];
      if (timeline) {
        timeline.loop = action.payload.loop;
      }
    },

    setTimelineDelay: (state, action: PayloadAction<{ objectId: string; delay: number }>) => {
      const timeline = state.timelines[action.payload.objectId];
      if (timeline) {
        timeline.delay = action.payload.delay;
      }
    },

    // Keyframe Management
    addKeyframe: (state, action: PayloadAction<{ 
      objectId: string; 
      keyframe: AnimationKeyframe 
    }>) => {
      const timeline = state.timelines[action.payload.objectId];
      if (timeline) {
        timeline.keyframes.push(action.payload.keyframe);
        // Sort keyframes by time
        timeline.keyframes.sort((a, b) => a.time - b.time);
      }
    },

    updateKeyframe: (state, action: PayloadAction<{ 
      objectId: string; 
      keyframeIndex: number; 
      keyframe: Partial<AnimationKeyframe> 
    }>) => {
      const timeline = state.timelines[action.payload.objectId];
      if (timeline && timeline.keyframes[action.payload.keyframeIndex]) {
        Object.assign(timeline.keyframes[action.payload.keyframeIndex], action.payload.keyframe);
        // Re-sort if time changed
        timeline.keyframes.sort((a, b) => a.time - b.time);
      }
    },

    deleteKeyframe: (state, action: PayloadAction<{ objectId: string; keyframeIndex: number }>) => {
      const timeline = state.timelines[action.payload.objectId];
      if (timeline) {
        timeline.keyframes.splice(action.payload.keyframeIndex, 1);
      }
    },

    // Preset Application
    applyPreset: (state, action: PayloadAction<{ 
      objectId: string; 
      preset: { name: string; keyframes: AnimationKeyframe[] };
      startTime?: number;
    }>) => {
      const timeline = state.timelines[action.payload.objectId];
      if (timeline) {
        const startTime = action.payload.startTime || 0;
        const adjustedKeyframes = action.payload.preset.keyframes.map(kf => ({
          ...kf,
          time: kf.time + startTime,
        }));
        
        timeline.keyframes.push(...adjustedKeyframes);
        timeline.keyframes.sort((a, b) => a.time - b.time);
      }
    },

    // Playback Control
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = Math.max(0, Math.min(action.payload, state.duration));
    },

    play: (state) => {
      state.isPlaying = true;
    },

    pause: (state) => {
      state.isPlaying = false;
    },

    stop: (state) => {
      state.isPlaying = false;
      state.currentTime = 0;
    },

    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
      // Update all timeline durations if they're longer
      Object.values(state.timelines).forEach(timeline => {
        if (timeline.duration > action.payload) {
          timeline.duration = action.payload;
          timeline.keyframes = timeline.keyframes.filter(kf => kf.time <= action.payload);
        }
      });
    },

    setFrameRate: (state, action: PayloadAction<number>) => {
      state.frameRate = action.payload;
    },

    // Bulk Operations
    copyAnimation: (state, action: PayloadAction<{ fromObjectId: string; toObjectId: string }>) => {
      const sourceTimeline = state.timelines[action.payload.fromObjectId];
      if (sourceTimeline) {
        const copiedTimeline: AnimationTimeline = {
          ...sourceTimeline,
          id: `timeline_${Date.now()}`,
          objectId: action.payload.toObjectId,
        };
        state.timelines[action.payload.toObjectId] = copiedTimeline;
      }
    },

    clearAllAnimations: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach(objectId => {
        delete state.timelines[objectId];
      });
    },

    // Advanced Features
    offsetKeyframes: (state, action: PayloadAction<{ 
      objectId: string; 
      offset: number; 
      startIndex?: number 
    }>) => {
      const timeline = state.timelines[action.payload.objectId];
      if (timeline) {
        const startIndex = action.payload.startIndex || 0;
        for (let i = startIndex; i < timeline.keyframes.length; i++) {
          timeline.keyframes[i].time += action.payload.offset;
        }
        timeline.keyframes.sort((a, b) => a.time - b.time);
      }
    },

    scaleKeyframes: (state, action: PayloadAction<{ 
      objectId: string; 
      scale: number;
      preserveFirst?: boolean;
    }>) => {
      const timeline = state.timelines[action.payload.objectId];
      if (timeline) {
        const preserveFirst = action.payload.preserveFirst !== false;
        timeline.keyframes.forEach((kf, index) => {
          if (!preserveFirst || index > 0) {
            kf.time *= action.payload.scale;
          }
        });
        timeline.duration *= action.payload.scale;
      }
    },

    // Error Handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Save Animations
      .addCase(saveAnimations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveAnimations.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(saveAnimations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to save animations';
      })

      // Magic Animation Generation
      .addCase(generateMagicAnimation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateMagicAnimation.fulfilled, (state, action) => {
        state.loading = false;
        // Apply generated animations
        action.payload.animations.forEach((animation: AnimationTimeline) => {
          state.timelines[animation.objectId] = animation;
        });
      })
      .addCase(generateMagicAnimation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate magic animation';
      });
  },
});

export const {
  createTimeline,
  deleteTimeline,
  selectTimeline,
  updateTimelineDuration,
  setTimelineLoop,
  setTimelineDelay,
  addKeyframe,
  updateKeyframe,
  deleteKeyframe,
  applyPreset,
  setCurrentTime,
  play,
  pause,
  stop,
  setDuration,
  setFrameRate,
  copyAnimation,
  clearAllAnimations,
  offsetKeyframes,
  scaleKeyframes,
  setError,
  clearError,
} = animationSlice.actions;

// Alias for compatibility
export const addAnimation = addKeyframe;

export default animationSlice.reducer;