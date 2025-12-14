// Node.js polyfill for requestAnimationFrame
// Targets ~60fps (16.67ms per frame)
const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

let lastTime = 0;
let frameId = 0;
const callbacks = new Map<number, FrameRequestCallback>();

const executeFrame = () => {
  const currentTime = Date.now();
  const elapsed = currentTime - lastTime;

  if (elapsed >= FRAME_DURATION) {
    lastTime = currentTime - (elapsed % FRAME_DURATION);

    // Execute all pending callbacks
    const pendingCallbacks = Array.from(callbacks.entries());
    callbacks.clear();

    for (const [id, callback] of pendingCallbacks) {
      try {
        callback(currentTime);
      } catch (error) {
        console.error(
          `Error in requestAnimationFrame callback (id: ${id}):`,
          error,
        );
      }
    }
  }

  // Continue the loop if there are pending callbacks
  if (callbacks.size > 0) {
    setImmediate(executeFrame);
  }
};

export const requestAnimationFrame = (
  callback: FrameRequestCallback,
): number => {
  const id = ++frameId;
  const wasEmpty = callbacks.size === 0;

  callbacks.set(id, callback);

  // Start the loop if this is the first callback
  if (wasEmpty) {
    lastTime = Date.now();
    setImmediate(executeFrame);
  }

  return id;
};

export const cancelAnimationFrame = (handle: number): void => {
  callbacks.delete(handle);
};
