import { ChangeEvent, useEffect } from "react";
import { useEngineStore } from "../store/useEngineStore";

export default function TransportInfo() {
  const { bpm, setBpm, timeSignature, getEngine } = useEngineStore();

  const onBpmChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(event.target.value);
    setBpm(newBpm);
  };

  useEffect(() => {
    let animationFrameId: number;
    const positionElement = document.getElementById("transport-position")!;
    let prevPosition = "";

    const updatePosition = () => {
      const engine = getEngine();
      const position = engine.transport.playhead.toNotation();

      if (prevPosition !== position) {
        prevPosition = position;
        positionElement.textContent = position;
      }

      animationFrameId = requestAnimationFrame(updatePosition);
    };

    // Start the animation loop
    animationFrameId = requestAnimationFrame(updatePosition);

    // Cleanup function to cancel animation frame on unmount
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [getEngine]);

  return (
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
          <span className="font-mono">
            {timeSignature[0]}/{timeSignature[1]}
          </span>
        </div>
      </div>

      {/* Current Position */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Position:</span>
        <div
          id="transport-position"
          className="bg-gray-700 border border-gray-600 rounded px-3 py-1 font-mono text-lg"
        ></div>
      </div>
    </div>
  );
}
