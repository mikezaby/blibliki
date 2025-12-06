import { TransportState } from "@blibliki/engine";
import { useEffect, useRef, useCallback } from "react";
import { useEngineStore } from "../store/useEngineStore";

const pixelsPerBeat = 50;

export default function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastPlayheadRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);

  const { getEngine, timeSignature } = useEngineStore();

  // Use a ref to store the animation loop function to avoid forward reference issues
  const updatePlayheadRef = useRef<(() => void) | undefined>(undefined);

  const updatePlayhead = useCallback(() => {
    if (!playheadRef.current || !timelineRef.current) return;

    const engine = getEngine();
    const transportPosition = engine.transport.position;
    const isPlaying = engine.state === TransportState.playing;

    // Calculate total position in pixels
    const totalBeats =
      transportPosition.totalBeats + transportPosition.beatFraction;
    const position = totalBeats * pixelsPerBeat;

    // Directly update DOM element position
    playheadRef.current.style.transform = `translateX(${position}px)`;

    const timelineContainer = timelineRef.current;
    const containerWidth = timelineContainer.offsetWidth;

    // Detect play start - focus on playhead immediately
    if (isPlaying && !wasPlayingRef.current) {
      // Playback just started - jump to center playhead
      timelineContainer.scrollLeft = position - containerWidth / 2;
    }
    // During playback, keep playhead locked in center (smooth scrolling)
    else if (isPlaying) {
      const targetScroll = position - containerWidth / 2;
      const currentScroll = timelineContainer.scrollLeft;
      const scrollDiff = targetScroll - currentScroll;

      // Smooth scroll interpolation (adjust 0.1 for smoothness vs responsiveness)
      if (Math.abs(scrollDiff) > 1) {
        timelineContainer.scrollLeft = currentScroll + scrollDiff * 0.3;
      }
    }

    // Store current state for next frame (always run this)
    lastPlayheadRef.current = totalBeats;
    wasPlayingRef.current = isPlaying;

    // Continue the animation loop using ref to avoid forward reference
    if (updatePlayheadRef.current) {
      animationFrameRef.current = requestAnimationFrame(
        updatePlayheadRef.current,
      );
    }
  }, [getEngine]);

  // Keep ref synchronized with latest callback in an effect
  useEffect(() => {
    updatePlayheadRef.current = updatePlayhead;
  }, [updatePlayhead]);

  useEffect(() => {
    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(updatePlayhead);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updatePlayhead]);

  return (
    <div className="timeline-container">
      {/* Timeline content */}
      <div
        className="timeline-scroll relative overflow-x-auto bg-gray-900"
        ref={timelineRef}
      >
        {/* Timeline Ruler */}
        <div
          className="timeline-ruler bg-gray-800 border-b border-gray-600 h-8 relative"
          style={{ minWidth: "40000px" }}
        >
          {/* Bar and Beat markers */}
          {Array.from({ length: 200 }, (_, barIndex) => {
            const barPixelPos = barIndex * timeSignature[0] * pixelsPerBeat;
            return (
              <div key={`bar-${barIndex}`} className="absolute top-0 h-full">
                {/* Bar marker */}
                <div
                  className="absolute top-0 w-px bg-gray-300 h-full z-10"
                  style={{ left: `${barPixelPos}px` }}
                />
                {/* Bar number */}
                <div
                  className="absolute top-1 text-xs text-gray-200 font-mono"
                  style={{ left: `${barPixelPos + 2}px` }}
                >
                  {barIndex + 1}
                </div>

                {/* Beat markers within each bar */}
                {Array.from(
                  { length: timeSignature[0] - 1 },
                  (_, beatIndex) => {
                    const beatPixelPos =
                      barPixelPos + (beatIndex + 1) * pixelsPerBeat;
                    return (
                      <div key={`beat-${barIndex}-${beatIndex}`}>
                        <div
                          className="absolute top-0 w-px bg-gray-500 h-4"
                          style={{ left: `${beatPixelPos}px` }}
                        />
                        {/* Beat numbers */}
                        <div
                          className="absolute top-4 text-xs text-gray-400 font-mono"
                          style={{
                            left: `${beatPixelPos + 1}px`,
                            fontSize: "10px",
                          }}
                        >
                          {beatIndex + 2}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            );
          })}
        </div>

        {/* Main timeline track */}
        <div
          className="timeline-track bg-gray-700 h-20 relative"
          style={{ minWidth: "40000px" }}
        >
          {/* Playhead indicator */}
          <div
            ref={playheadRef}
            className="absolute top-0 w-1 h-full bg-red-500 pointer-events-none z-10"
            style={{ transform: "translateX(0px)" }}
          />

          {/* Timeline content/tracks */}
          <div className="timeline-content absolute inset-0">
            {/* Add your timeline tracks, clips, etc. here */}
          </div>
        </div>
      </div>
    </div>
  );
}
