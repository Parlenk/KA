import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import {
  createTimeline,
  deleteTimeline,
  selectTimeline,
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
  updateTimelineDuration,
  setTimelineLoop,
  generateMagicAnimation,
} from '../../store/slices/animationSlice';
import { AnimationKeyframe, ANIMATION_PRESETS } from '../../types/design';
import { Play, Pause, Square, SkipBack, SkipForward, Plus, Trash2, Copy, Sparkles } from 'lucide-react';

interface TimelineEditorProps {
  className?: string;
}

const TimelineEditor: React.FC<TimelineEditorProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const {
    timelines,
    selectedTimelineId,
    currentTime,
    isPlaying,
    duration,
    frameRate,
    presets,
    loading,
  } = useSelector((state: RootState) => state.animation);
  
  const { selectedObjectIds } = useSelector((state: RootState) => state.design);
  
  const [selectedKeyframe, setSelectedKeyframe] = useState<{ timelineId: string; index: number } | null>(null);
  const [isDraggingTime, setIsDraggingTime] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Playback control
  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = setInterval(() => {
        dispatch(setCurrentTime(currentTime + (1000 / frameRate)));
        if (currentTime >= duration) {
          dispatch(stop());
        }
      }, 1000 / frameRate);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, frameRate, dispatch]);

  const handlePlay = () => {
    if (currentTime >= duration) {
      dispatch(setCurrentTime(0));
    }
    dispatch(play());
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timelineWidth = rect.width - 200; // Account for timeline labels
    const clickedTime = (x / timelineWidth) * duration * zoom;
    
    dispatch(setCurrentTime(Math.max(0, Math.min(clickedTime, duration))));
  };

  const handleKeyframeDrag = useCallback((timelineId: string, keyframeIndex: number, newTime: number) => {
    dispatch(updateKeyframe({
      objectId: timelineId,
      keyframeIndex,
      keyframe: { time: Math.max(0, Math.min(newTime, duration)) },
    }));
  }, [dispatch, duration]);

  const handleAddKeyframe = (timelineId: string) => {
    const keyframe: AnimationKeyframe = {
      time: currentTime,
      properties: {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      },
      easing: 'ease-in-out',
    };
    
    dispatch(addKeyframe({ objectId: timelineId, keyframe }));
  };

  const handleApplyPreset = (preset: any) => {
    if (selectedObjectIds.length > 0) {
      selectedObjectIds.forEach(objectId => {
        // Create timeline if it doesn't exist
        if (!timelines[objectId]) {
          dispatch(createTimeline({ objectId }));
        }
        
        dispatch(applyPreset({
          objectId,
          preset,
          startTime: currentTime,
        }));
      });
    }
    setShowPresets(false);
  };

  const handleMagicAnimation = () => {
    if (selectedObjectIds.length > 0) {
      dispatch(generateMagicAnimation({
        objectIds: selectedObjectIds,
        style: 'dynamic',
        duration,
      }));
    }
  };

  const timelineKeys = Object.keys(timelines);

  return (
    <div className={`bg-white border-t border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Animation Timeline</h3>
          <span className="text-sm text-gray-500">
            {timelineKeys.length} timeline{timelineKeys.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Magic Animation */}
          <button
            onClick={handleMagicAnimation}
            disabled={selectedObjectIds.length === 0 || loading}
            className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Magic</span>
          </button>

          {/* Presets */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Presets</span>
            </button>
            
            {showPresets && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-64">
                {Object.entries(presets).map(([category, animations]) => (
                  <div key={category} className="p-2">
                    <h4 className="font-medium text-gray-900 text-sm mb-2 capitalize">
                      {category.toLowerCase()}
                    </h4>
                    <div className="space-y-1">
                      {animations.map((preset, index) => (
                        <button
                          key={index}
                          onClick={() => handleApplyPreset(preset)}
                          className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="flex items-center space-x-2 text-sm">
            <label>Duration:</label>
            <input
              type="number"
              value={duration / 1000}
              onChange={(e) => dispatch(setDuration(parseFloat(e.target.value) * 1000))}
              className="w-16 px-2 py-1 border border-gray-300 rounded"
              min="0.1"
              max="60"
              step="0.1"
            />
            <span>s</span>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <label>FPS:</label>
            <select
              value={frameRate}
              onChange={(e) => dispatch(setFrameRate(parseInt(e.target.value)))}
              className="px-2 py-1 border border-gray-300 rounded"
            >
              <option value={24}>24</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => dispatch(setCurrentTime(0))}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={isPlaying ? () => dispatch(pause()) : handlePlay}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          
          <button
            onClick={() => dispatch(stop())}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
          >
            <Square className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => dispatch(setCurrentTime(duration))}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {Math.round(currentTime)}ms / {duration}ms
          </span>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm">Zoom:</label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-sm w-8">{zoom.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="h-80 overflow-auto">
        {timelineKeys.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p>No animations yet</p>
              <p className="text-sm mt-1">Select objects and add keyframes to get started</p>
            </div>
          </div>
        ) : (
          <div
            ref={timelineRef}
            className="relative"
            onClick={handleTimelineClick}
          >
            {/* Time Ruler */}
            <TimeRuler duration={duration} zoom={zoom} currentTime={currentTime} />
            
            {/* Timeline Tracks */}
            <div className="space-y-1">
              {timelineKeys.map((objectId) => (
                <TimelineTrack
                  key={objectId}
                  timeline={timelines[objectId]}
                  isSelected={selectedTimelineId === objectId}
                  onSelect={() => dispatch(selectTimeline(objectId))}
                  onDelete={() => dispatch(deleteTimeline(objectId))}
                  onAddKeyframe={() => handleAddKeyframe(objectId)}
                  onKeyframeDrag={handleKeyframeDrag}
                  duration={duration}
                  zoom={zoom}
                  currentTime={currentTime}
                  selectedKeyframe={selectedKeyframe}
                  onSelectKeyframe={setSelectedKeyframe}
                />
              ))}
            </div>
            
            {/* Current Time Indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
              style={{
                left: `${200 + (currentTime / duration) * (100 / zoom)}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Time Ruler Component
const TimeRuler: React.FC<{
  duration: number;
  zoom: number;
  currentTime: number;
}> = ({ duration, zoom }) => {
  const ticks = [];
  const tickCount = Math.ceil(duration / 100) * zoom; // One tick per 100ms, adjusted for zoom
  
  for (let i = 0; i <= tickCount; i++) {
    const time = (i / tickCount) * duration;
    const isSecond = time % 1000 === 0;
    
    ticks.push(
      <div
        key={i}
        className={`absolute ${isSecond ? 'h-6 border-gray-400' : 'h-3 border-gray-300'} border-l`}
        style={{ left: `${(time / duration) * 100}%` }}
      >
        {isSecond && (
          <span className="absolute top-6 left-1 text-xs text-gray-600 -translate-x-1/2">
            {time / 1000}s
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="relative h-12 bg-gray-100 border-b border-gray-200" style={{ marginLeft: '200px' }}>
      {ticks}
    </div>
  );
};

// Timeline Track Component
interface TimelineTrackProps {
  timeline: any;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onAddKeyframe: () => void;
  onKeyframeDrag: (timelineId: string, keyframeIndex: number, newTime: number) => void;
  duration: number;
  zoom: number;
  currentTime: number;
  selectedKeyframe: { timelineId: string; index: number } | null;
  onSelectKeyframe: (selection: { timelineId: string; index: number } | null) => void;
}

const TimelineTrack: React.FC<TimelineTrackProps> = ({
  timeline,
  isSelected,
  onSelect,
  onDelete,
  onAddKeyframe,
  onKeyframeDrag,
  duration,
  zoom,
  currentTime,
  selectedKeyframe,
  onSelectKeyframe,
}) => {
  const [isDragging, setIsDragging] = useState<{ index: number; startTime: number } | null>(null);

  const handleKeyframeMouseDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setIsDragging({ index, startTime: timeline.keyframes[index].time });
    onSelectKeyframe({ timelineId: timeline.objectId, index });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate new time based on mouse position
    const timelineElement = document.querySelector('.timeline-track');
    if (!timelineElement) return;
    
    const rect = timelineElement.getBoundingClientRect();
    const x = e.clientX - rect.left - 200; // Account for label width
    const trackWidth = rect.width - 200;
    const newTime = (x / trackWidth) * duration * zoom;
    
    onKeyframeDrag(timeline.objectId, isDragging.index, newTime);
  }, [isDragging, timeline.objectId, duration, zoom, onKeyframeDrag]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`timeline-track flex items-center h-12 border-b border-gray-100 hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={onSelect}
    >
      {/* Track Label */}
      <div className="w-48 px-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 truncate">
          Object {timeline.objectId.slice(-8)}
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddKeyframe();
            }}
            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Track Timeline */}
      <div className="flex-1 relative h-full border-l border-gray-200">
        {/* Keyframes */}
        {timeline.keyframes.map((keyframe: AnimationKeyframe, index: number) => {
          const left = (keyframe.time / duration) * 100;
          const isSelectedKeyframe = selectedKeyframe?.timelineId === timeline.objectId && 
                                   selectedKeyframe?.index === index;
          
          return (
            <div
              key={index}
              className={`absolute top-1/2 w-3 h-3 rounded-full transform -translate-y-1/2 cursor-pointer ${
                isSelectedKeyframe ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-gray-600 hover:bg-blue-500'
              }`}
              style={{ left: `${left}%`, marginLeft: '-6px' }}
              onMouseDown={(e) => handleKeyframeMouseDown(e, index)}
              title={`${keyframe.time}ms`}
            />
          );
        })}
        
        {/* Duration Bar */}
        <div
          className="absolute top-1/2 h-1 bg-blue-200 transform -translate-y-1/2"
          style={{
            left: '0%',
            width: `${(timeline.duration / duration) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

export default TimelineEditor;