import { useEffect, useState } from "react";

type WebkitFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

// Safari only ever shipped the prefixed Fullscreen API, on the desktop and on
// iPadOS alike, so checking the standard names alone hides the control on every
// Safari there is. iPhone Safari has neither and nothing can be done about
// that: element fullscreen does not exist on it.
function getFullscreenApi() {
  if (typeof document === "undefined") {
    return undefined;
  }

  const owner = document as WebkitFullscreenDocument;
  const root = document.documentElement as WebkitFullscreenElement;
  const prefixed = typeof root.requestFullscreen !== "function";

  const canRequest = prefixed
    ? typeof root.webkitRequestFullscreen === "function"
    : true;
  const canExit = prefixed
    ? typeof owner.webkitExitFullscreen === "function"
    : typeof owner.exitFullscreen === "function";

  if (!canRequest || !canExit) {
    return undefined;
  }

  return {
    // Called as methods rather than through extracted references, so `this`
    // is whatever each implementation expects it to be.
    request: () =>
      prefixed ? root.webkitRequestFullscreen?.() : root.requestFullscreen(),
    exit: () =>
      prefixed ? owner.webkitExitFullscreen?.() : owner.exitFullscreen(),
    isFullscreen: () =>
      (owner.fullscreenElement ?? owner.webkitFullscreenElement) === root,
  };
}

export function useFullscreen(allowed: boolean) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const api = getFullscreenApi();
    if (!api) {
      return;
    }

    const syncFullscreenState = () => {
      setIsFullscreen(api.isFullscreen());
    };

    syncFullscreenState();
    // Safari reports the change under its own event name.
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener(
        "webkitfullscreenchange",
        syncFullscreenState,
      );
    };
  }, []);

  const api = allowed ? getFullscreenApi() : undefined;

  const toggle = async () => {
    if (!api) {
      return;
    }

    await (api.isFullscreen() ? api.exit() : api.request());
  };

  return { available: api !== undefined, isFullscreen, toggle };
}
