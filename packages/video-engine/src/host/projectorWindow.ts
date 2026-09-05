export type ProjectorWindow = {
  window: Window;
  canvas: HTMLCanvasElement;
};

const STYLE = `html,body{margin:0;height:100%;background:#000;overflow:hidden}
canvas{display:block;width:100%;height:100%}`;

// Must be called from a user gesture or the browser blocks the popup.
// ponytail: manual placement plus click-to-fullscreen; the Window Management
// API can pick the projector screen automatically in Chrome, add when
// dragging the window over becomes a chore.
export function openProjectorWindow(): ProjectorWindow | null {
  const win = window.open(
    "",
    "blibliki-visuals",
    "popup,width=1280,height=720",
  );
  if (!win) return null;

  const { document } = win;
  document.title = "blibliki visuals";
  document.body.replaceChildren();
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);

  canvas.addEventListener("click", () => {
    void canvas.requestFullscreen();
  });

  return { window: win, canvas };
}
