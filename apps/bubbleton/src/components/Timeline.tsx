import { useRef, useEffect } from 'react';

interface TimeSignature {
  numerator: number;
  denominator: number;
}

interface TimelineProps {
  playheadPosition: number;
  scrollOffset: number;
  timeSignature: TimeSignature;
  isPlaying: boolean;
  onScrollOffsetChange: (offset: number) => void;
}

export default function Timeline({ 
  playheadPosition, 
  scrollOffset, 
  timeSignature, 
  isPlaying,
  onScrollOffsetChange
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Visual constants
  const barWidth = 200; // pixels per bar
  const totalBars = 100; // Show 100 bars initially
  const timelineWidth = totalBars * barWidth;

  // Auto-scroll logic
  useEffect(() => {
    if (containerRef.current && isPlaying) {
      const containerWidth = containerRef.current.clientWidth;
      const scrollThreshold = containerWidth * 0.8; // Start scrolling when playhead is 80% across screen
      
      if (playheadPosition - scrollOffset > scrollThreshold) {
        const newScrollOffset = playheadPosition - containerWidth * 0.2; // Keep playhead at 20% from left
        onScrollOffsetChange(Math.max(0, newScrollOffset));
      }
    }
  }, [playheadPosition, scrollOffset, isPlaying, onScrollOffsetChange]);

  return (
    <div className="w-full">
      {/* Timeline Container */}
      <div 
        ref={containerRef}
        className="relative w-full h-24 bg-gray-800 border border-gray-700 overflow-hidden"
      >
        {/* Timeline */}
        <div
          ref={timelineRef}
          className="relative h-full transition-transform duration-75 ease-linear"
          style={{ 
            width: `${timelineWidth}px`,
            transform: `translateX(-${scrollOffset}px)`
          }}
        >
          {/* Bars */}
          {Array.from({ length: totalBars }, (_, barIndex) => (
            <div
              key={barIndex}
              className="absolute top-0 h-full border-r border-gray-600"
              style={{
                left: `${barIndex * barWidth}px`,
                width: `${barWidth}px`
              }}
            >
              {/* Bar number */}
              <div className="absolute top-1 left-2 text-xs font-bold text-gray-300">
                {barIndex + 1}
              </div>
              
              {/* Beat markers */}
              <div className="absolute top-6 left-0 right-0 bottom-0 flex">
                {Array.from({ length: timeSignature.numerator }, (_, beatIndex) => (
                  <div
                    key={beatIndex}
                    className="flex-1 border-r border-gray-700 last:border-r-0 relative"
                  >
                    {/* Beat number */}
                    <div className="absolute top-1 left-1 text-xs text-gray-500">
                      {beatIndex + 1}
                    </div>
                    
                    {/* Subdivision markers */}
                    <div className="absolute top-6 left-0 right-0 bottom-0 flex">
                      {Array.from({ length: 4 }, (_, subIndex) => (
                        <div
                          key={subIndex}
                          className="flex-1 border-r border-gray-800 last:border-r-0 bg-gray-750"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Playhead */}
          <div
            className="absolute top-0 w-0.5 h-full bg-blue-500 z-10 transition-all duration-75 ease-linear"
            style={{ left: `${playheadPosition}px` }}
          >
            <div className="w-3 h-3 bg-blue-500 rounded-full -ml-1.5 -mt-1 border-2 border-white"></div>
          </div>
        </div>
      </div>
      
      {/* Status */}
      <div className="mt-4 flex justify-between items-center text-gray-400">
        <div>
          {isPlaying ? '🎵 Playing...' : '⏸️ Paused'}
        </div>
        <div className="text-sm">
          Scroll Offset: {Math.round(scrollOffset)}px | Playhead: {Math.round(playheadPosition)}px
        </div>
      </div>
    </div>
  );
}