import { useState, useEffect, useRef } from "react";
import "./style.css";

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState({
    numerator: 4,
    denominator: 4,
  });
  const [currentPosition, setCurrentPosition] = useState({
    bar: 1,
    beat: 1,
    subdivision: 1,
  });
  const [playheadPosition, setPlayheadPosition] = useState(0); // Position in pixels
  const [scrollOffset, setScrollOffset] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate beat duration in milliseconds
  const beatDuration = (60 / bpm) * 1000;
  const subdivisionDuration = beatDuration / 4; // 16th notes

  // Visual constants
  const barWidth = 200; // pixels per bar
  const beatWidth = barWidth / timeSignature.numerator;
  const totalBars = 100; // Show 100 bars initially
  const timelineWidth = totalBars * barWidth;

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now() - pausedTimeRef.current;

      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const totalSubdivisions = Math.floor(elapsed / subdivisionDuration);

        // Calculate current position
        const beatsPerBar = timeSignature.numerator;
        const subdivisionsPerBeat = 4;
        const subdivisionsPerBar = beatsPerBar * subdivisionsPerBeat;

        const currentBar =
          Math.floor(totalSubdivisions / subdivisionsPerBar) + 1;
        const remainingSubdivisions = totalSubdivisions % subdivisionsPerBar;
        const currentBeat =
          Math.floor(remainingSubdivisions / subdivisionsPerBeat) + 1;
        const currentSubdivision =
          (remainingSubdivisions % subdivisionsPerBeat) + 1;

        setCurrentPosition({
          bar: currentBar,
          beat: currentBeat,
          subdivision: currentSubdivision,
        });

        // Update playhead position in pixels
        const barOffset = (currentBar - 1) * barWidth;
        const positionInBar =
          (remainingSubdivisions / subdivisionsPerBar) * barWidth;
        const totalPosition = barOffset + positionInBar;
        setPlayheadPosition(totalPosition);

        // Auto-scroll logic
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const scrollThreshold = containerWidth * 0.8; // Start scrolling when playhead is 80% across screen

          if (totalPosition - scrollOffset > scrollThreshold) {
            const newScrollOffset = totalPosition - containerWidth * 0.2; // Keep playhead at 20% from left
            setScrollOffset(Math.max(0, newScrollOffset));
          }
        }
      }, 10); // Update every 10ms for smooth animation
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (startTimeRef.current > 0) {
        pausedTimeRef.current = Date.now() - startTimeRef.current;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    isPlaying,
    bpm,
    subdivisionDuration,
    timeSignature.numerator,
    barWidth,
    scrollOffset,
  ]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentPosition({ bar: 1, beat: 1, subdivision: 1 });
    setPlayheadPosition(0);
    setScrollOffset(0);
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value);
    if (!isNaN(newBpm) && newBpm > 0) {
      setBpm(newBpm);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
            >
              {isPlaying ? <span>⏸️ Pause</span> : <span>▶️ Start</span>}
            </button>

            {/* Stop Button */}
            <button
              onClick={handleStop}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
            >
              <span>⏹️ Stop</span>
            </button>
          </div>

          <div className="flex items-center space-x-6">
            {/* BPM Input */}
            <div className="flex items-center space-x-2">
              <label htmlFor="bpm" className="text-sm font-medium">
                BPM:
              </label>
              <input
                id="bpm"
                type="number"
                value={bpm}
                onChange={handleBpmChange}
                min="1"
                max="300"
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 w-20 text-center focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Time Signature */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Time:</span>
              <div className="bg-gray-700 border border-gray-600 rounded px-3 py-1">
                <span className="font-mono">
                  {timeSignature.numerator}/{timeSignature.denominator}
                </span>
              </div>
            </div>

            {/* Current Position */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Position:</span>
              <div className="bg-gray-700 border border-gray-600 rounded px-3 py-1 font-mono text-lg">
                {currentPosition.bar} : {currentPosition.beat} :{" "}
                {currentPosition.subdivision}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="p-4">
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
                transform: `translateX(-${scrollOffset}px)`,
              }}
            >
              {/* Bars */}
              {Array.from({ length: totalBars }, (_, barIndex) => (
                <div
                  key={barIndex}
                  className="absolute top-0 h-full border-r border-gray-600"
                  style={{
                    left: `${barIndex * barWidth}px`,
                    width: `${barWidth}px`,
                  }}
                >
                  {/* Bar number */}
                  <div className="absolute top-1 left-2 text-xs font-bold text-gray-300">
                    {barIndex + 1}
                  </div>

                  {/* Beat markers */}
                  <div className="absolute top-6 left-0 right-0 bottom-0 flex">
                    {Array.from(
                      { length: timeSignature.numerator },
                      (_, beatIndex) => (
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
                      ),
                    )}
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
            <div>{isPlaying ? "🎵 Playing..." : "⏸️ Paused"}</div>
            <div className="text-sm">
              Scroll Offset: {Math.round(scrollOffset)}px | Playhead:{" "}
              {Math.round(playheadPosition)}px
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
