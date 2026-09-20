import { useLayoutEffect, useState, type RefObject } from "react";

// The console is a faceplate, not a responsive page: it is laid out once at this
// width and then scaled as a whole to whatever screen it lands on. Nothing
// inside reflows, so an 8-encoder band stays an 8-encoder band on a phone.
const DESIGN_WIDTH = 1536;

// A device you turn, rather than a window you resize: the primary pointer is a
// finger and there is no hover. Rotating the console only makes sense somewhere
// the performer can rotate the hardware back, so a narrow desktop window keeps
// the orientation its display has and simply scales down.
export function isHandheldDevice() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse) and (hover: none)").matches
  );
}

// Uniform scale that fits the faceplate inside the stage, growing as well as
// shrinking so the console always fills what it is given, plus the offset that
// centres the scaled result.
//
// The centring is done by hand rather than by the layout on purpose. The
// faceplate's layout box stays DESIGN_WIDTH wide however small the stage gets,
// and centring a box wider than its container is where the browser's own
// alignment gets subtle: a grid item lands in an implicit `auto` track sized to
// its own max-content, so it is centred in 1536px of track rather than in the
// stage, and drifts off screen as the stage shrinks. With `transform-origin: 0
// 0` and an explicit translate there is nothing left to interpret.
export function createFaceplateFit(
  stageWidth: number,
  stageHeight: number,
  contentHeight: number,
  canRotate = false,
) {
  if (stageWidth <= 0 || stageHeight <= 0 || contentHeight <= 0) {
    return { scale: 1, x: 0, y: 0, rotated: false };
  }

  // No browser lets a page demand landscape — screen.orientation.lock needs
  // fullscreen where it exists at all, and iOS has never had it — so on a
  // handheld held upright the console turns a quarter turn instead and the
  // performer turns the device to match. Held in landscape there is nothing to
  // do.
  const rotated = canRotate && stageHeight > stageWidth;
  if (rotated) {
    const scale = Math.min(
      stageHeight / DESIGN_WIDTH,
      stageWidth / contentHeight,
    );

    // Rotating by 90° puts the faceplate's own +y along screen -x, so its
    // width lands on the stage's height and the leftover is split the other
    // way about.
    return {
      scale,
      x: (stageWidth + contentHeight * scale) / 2,
      y: (stageHeight - DESIGN_WIDTH * scale) / 2,
      rotated,
    };
  }

  const scale = Math.min(
    stageWidth / DESIGN_WIDTH,
    stageHeight / contentHeight,
  );

  return {
    scale,
    x: (stageWidth - DESIGN_WIDTH * scale) / 2,
    y: (stageHeight - contentHeight * scale) / 2,
    rotated,
  };
}

export function createFaceplateStyle(fit: {
  scale: number;
  x: number;
  y: number;
  rotated: boolean;
}) {
  const rotate = fit.rotated ? " rotate(90deg)" : "";

  return {
    width: DESIGN_WIDTH,
    transformOrigin: "0 0",
    transform: `translate(${String(fit.x)}px, ${String(fit.y)}px)${rotate} scale(${String(fit.scale)})`,
  };
}

export function useFitToScreen(
  stageRef: RefObject<HTMLDivElement | null>,
  faceplateRef: RefObject<HTMLDivElement | null>,
) {
  const [fit, setFit] = useState({ scale: 1, x: 0, y: 0, rotated: false });

  // Layout effect, so the first paint is already at the right size rather than
  // flashing a 1536px-wide console on a phone.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const faceplate = faceplateRef.current;
    // jsdom and other non-layout environments have no ResizeObserver; the
    // console still renders, just at 1:1.
    if (!stage || !faceplate || typeof ResizeObserver === "undefined") {
      return;
    }

    const measure = () => {
      // offsetHeight is the pre-transform layout height, so the scale this
      // produces never feeds back into the measurement it came from.
      setFit(
        createFaceplateFit(
          stage.clientWidth,
          stage.clientHeight,
          faceplate.offsetHeight,
          isHandheldDevice(),
        ),
      );
    };

    measure();
    // Observing the stage covers window resizes and orientation changes;
    // observing the faceplate covers content that grows, like a new notice.
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(faceplate);

    return () => {
      observer.disconnect();
    };
  }, [stageRef, faceplateRef]);

  return fit;
}
