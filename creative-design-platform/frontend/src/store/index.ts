// Redux store configuration for Phase 2
import { configureStore } from '@reduxjs/toolkit';
import designReducer from './slices/designSlice';
import animationReducer from './slices/animationSlice';
import brandKitReducer from './slices/brandKitSlice';
import canvasReducer from './slices/canvasSlice';
import exportReducer from './slices/exportSlice';

export const store = configureStore({
  reducer: {
    design: designReducer,
    animation: animationReducer,
    brandKit: brandKitReducer,
    canvas: canvasReducer,
    export: exportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;