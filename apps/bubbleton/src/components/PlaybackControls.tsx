interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
}

export default function PlaybackControls({ 
  isPlaying, 
  onPlayPause, 
  onStop 
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center space-x-4">
      {/* Play/Pause Button */}
      <button
        onClick={onPlayPause}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
      >
        {isPlaying ? (
          <span>⏸️ Pause</span>
        ) : (
          <span>▶️ Start</span>
        )}
      </button>
      
      {/* Stop Button */}
      <button
        onClick={onStop}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
      >
        <span>⏹️ Stop</span>
      </button>
    </div>
  );
}