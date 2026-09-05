import { Button, Stack } from "@blibliki/ui";
import { Projector } from "lucide-react";
import { useEffect, useRef } from "react";
import { store } from "@/store";
import { ensureVideoHost } from "@/video/videoHost";

const PREVIEW = { width: 160, height: 90, fps: 15 };

export default function VisualsBody({ id }: { id: string }) {
  const frameRef = useRef<HTMLDivElement>(null);

  // A canvas can be transferred once, so each effect run makes a fresh one.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const canvas = document.createElement("canvas");
    canvas.width = PREVIEW.width;
    canvas.height = PREVIEW.height;
    canvas.className = "block rounded bg-black";
    frame.replaceChildren(canvas);
    const host = ensureVideoHost(store);
    host.attachView(id, canvas, PREVIEW.fps);

    return () => {
      host.detachView(id);
      canvas.remove();
    };
  }, [id]);

  return (
    <Stack gap={2} align="center">
      <div
        ref={frameRef}
        style={{ width: PREVIEW.width, height: PREVIEW.height }}
      />
      <Button
        size="sm"
        variant="contained"
        color="neutral"
        onClick={() => {
          ensureVideoHost(store).open();
        }}
      >
        <Projector className="h-4 w-4" />
        Open projector
      </Button>
    </Stack>
  );
}
