import { requestAnimationFrame } from "@blibliki/utils";
import { ChangeEvent, useEffect } from "react";
import { useEngineStore } from "../store/useEngineStore";

const validDenominator = [2, 4, 8, 16];

const isValidDenominator = (value: number): value is 2 | 4 | 8 | 16 => {
  return validDenominator.includes(value);
};

export default function TransportInfo() {
  const { bpm, setBpm, timeSignature, setTimeSignature, getEngine } =
    useEngineStore();

  const onBpmChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(event.target.value);
    setBpm(newBpm);
  };

  const onTimeSignatureNumeratorChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const newNumerator = parseInt(event.target.value);
    setTimeSignature([newNumerator, timeSignature[1]]);
  };

  const onTimeSignatureDenominatorChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const newDenominator = parseInt(event.target.value);
    if (!isValidDenominator(newDenominator)) return;

    setTimeSignature([timeSignature[0], newDenominator]);
  };

  useEffect(() => {
    let animationFrameId: number;
    const positionElement = document.getElementById("transport-position")!;
    let prevPosition = "";

    const updatePosition = () => {
      const engine = getEngine();
      const transportPosition = engine.transport.position;
      const position = transportPosition.toString();

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
        <div className="flex items-center space-x-1">
          <input
            type="number"
            value={timeSignature[0]}
            onChange={onTimeSignatureNumeratorChange}
            min="1"
            max="16"
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-12 text-center focus:outline-none focus:border-blue-500"
          />
          <span className="font-mono">/</span>
          <input
            type="number"
            value={timeSignature[1]}
            onChange={onTimeSignatureDenominatorChange}
            min="2"
            max="16"
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-12 text-center focus:outline-none focus:border-blue-500"
          />
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
