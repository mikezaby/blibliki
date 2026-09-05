/// <reference types="vite/client" />
import { Engine, ModuleType } from "@blibliki/engine";
import { Button } from "@blibliki/ui";
import {
  IVideoPatch,
  VideoEngineHost,
  VideoModuleType,
} from "@blibliki/video-engine";
import VideoWorker from "@blibliki/video-engine/worker?worker";
import { Projector } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAppSelector } from "@/hooks";

// A gradient source, a hue rotation driven by the low band, and the output.
// Enough to see the projector react; a video patch editor replaces this.
function demoPatch(): IVideoPatch {
  return {
    modules: [
      {
        id: "src",
        name: "Source",
        moduleType: VideoModuleType.Source,
        props: {
          mode: "gradient",
          hue: 0,
          saturation: 1,
          lightness: 0.5,
          spread: 180,
        },
      },
      {
        id: "fx",
        name: "Hue",
        moduleType: VideoModuleType.HueRotate,
        props: { amount: 0 },
      },
      {
        id: "out",
        name: "Output",
        moduleType: VideoModuleType.Output,
        props: {},
      },
    ],
    routes: [
      {
        id: "r1",
        source: { moduleId: "src", ioName: "out" },
        destination: { moduleId: "fx", ioName: "in" },
      },
      {
        id: "r2",
        source: { moduleId: "fx", ioName: "out" },
        destination: { moduleId: "out", ioName: "in" },
      },
    ],
    bindings: [
      {
        id: "b1",
        moduleId: "fx",
        prop: "amount",
        control: "spectrum:low",
        inMin: 0,
        inMax: 1,
        outMin: 0,
        outMax: 360,
      },
    ],
  };
}

// ponytail: reads the first Spectrum module in the patch; a master-output
// analyser tap on the engine would not depend on the patch's contents.
function readSpectrumFrom(engine: Engine) {
  return () => {
    for (const module of engine.modules.values()) {
      if (module.moduleType === ModuleType.Spectrum) {
        return module.getFrequencies();
      }
    }
    return undefined;
  };
}

export default function VisualsButton() {
  const engineId = useAppSelector((state) => state.global.engineId);
  const hostRef = useRef<VideoEngineHost | null>(null);

  useEffect(
    () => () => {
      hostRef.current?.dispose();
      hostRef.current = null;
    },
    [],
  );

  const open = () => {
    if (!engineId) return;
    if (!hostRef.current) {
      const engine = Engine.getById(engineId);
      const host = new VideoEngineHost({
        patchSource: engine,
        createWorker: () => new VideoWorker(),
        readSpectrum: readSpectrumFrom(engine),
      });
      host.onError((message) => {
        console.error(`video engine: ${message}`);
      });
      host.send({ type: "load", patch: demoPatch() });
      hostRef.current = host;
    }
    hostRef.current.open();
  };

  return (
    <Button
      variant="text"
      color="neutral"
      className="rounded-full border border-zinc-700 bg-zinc-950 px-4 font-mono uppercase tracking-[0.14em] text-zinc-200 hover:bg-zinc-900"
      onClick={open}
    >
      <Projector className="h-4 w-4" />
      Visuals
    </Button>
  );
}
