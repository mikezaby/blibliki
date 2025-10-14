interface TimeSignature {
  numerator: number;
  denominator: number;
}

interface Position {
  bar: number;
  beat: number;
  subdivision: number;
}

interface TransportInfoProps {
  bpm: number;
  onBpmChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  timeSignature: TimeSignature;
  currentPosition: Position;
}

export default function TransportInfo({ 
  bpm, 
  onBpmChange, 
  timeSignature, 
  currentPosition 
}: TransportInfoProps) {
  return (
    <div className="flex items-center space-x-6">
      {/* BPM Input */}
      <div className="flex items-center space-x-2">
        <label htmlFor="bpm" className="text-sm font-medium">BPM:</label>
        <input
          id="bpm"
          type="number"
          value={bpm}
          onChange={onBpmChange}
          min="1"
          max="300"
          className="bg-gray-700 border border-gray-600 rounded px-3 py-1 w-20 text-center focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Time Signature */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Time:</span>
        <div className="bg-gray-700 border border-gray-600 rounded px-3 py-1">
          <span className="font-mono">{timeSignature.numerator}/{timeSignature.denominator}</span>
        </div>
      </div>

      {/* Current Position */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Position:</span>
        <div className="bg-gray-700 border border-gray-600 rounded px-3 py-1 font-mono text-lg">
          {currentPosition.bar} : {currentPosition.beat} : {currentPosition.subdivision}
        </div>
      </div>
    </div>
  );
}