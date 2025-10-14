import { useState, useEffect, useRef } from "react";
import PlaybackControls from "./components/PlaybackControls";
import Timeline from "./components/Timeline";
import TransportInfo from "./components/TransportInfo";
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

  // Calculate beat duration in milliseconds
  const beatDuration = (60 / bpm) * 1000;
  const subdivisionDuration = beatDuration / 4; // 16th notes

  // Visual constants
  const barWidth = 200; // pixels per bar

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
  }, [isPlaying, bpm, subdivisionDuration, timeSignature.numerator, barWidth]);

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

  const handleScrollOffsetChange = (offset: number) => {
    setScrollOffset(offset);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <PlaybackControls
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
          />

          <TransportInfo
            bpm={bpm}
            onBpmChange={handleBpmChange}
            timeSignature={timeSignature}
            currentPosition={currentPosition}
          />
        </div>
      </header>

      {/* Main */}
      <main className="p-4">
        <Timeline
          playheadPosition={playheadPosition}
          scrollOffset={scrollOffset}
          timeSignature={timeSignature}
          isPlaying={isPlaying}
          onScrollOffsetChange={handleScrollOffsetChange}
        />
      </main>
    </div>
  );
}
