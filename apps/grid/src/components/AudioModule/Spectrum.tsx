import { Engine, moduleSchemas, ModuleType } from "@blibliki/engine";
import { Stack, Surface } from "@blibliki/ui";
import { requestAnimationFrame } from "@blibliki/utils";
import { useEffect, useRef } from "react";
import { ModuleComponent } from ".";
import { InputField, SelectField } from "./attributes/Field";

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 160;

const Spectrum: ModuleComponent<ModuleType.Spectrum> = (props) => {
  const {
    id,
    updateProp,
    props: { fftSize, minDecibels, maxDecibels, smoothing },
  } = props;

  const schema = moduleSchemas[ModuleType.Spectrum];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let running = true;

    function draw() {
      const module = Engine.current.findModule(id);
      if (module.moduleType !== ModuleType.Spectrum)
        throw Error("Not a spectrum module");

      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (ctx) {
        const values = module.getFrequencies();
        const bins = values.length;
        const range = maxDecibels - minDecibels;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#22d3ee";

        for (let x = 0; x < CANVAS_WIDTH; x++) {
          const bin = Math.floor((x / CANVAS_WIDTH) * bins);
          const db = values[bin] ?? minDecibels;
          const norm = Math.min(1, Math.max(0, (db - minDecibels) / range));
          const height = norm * CANVAS_HEIGHT;
          ctx.fillRect(x, CANVAS_HEIGHT - height, 1, height);
        }
      }

      requestAnimationFrame(draw);
    }

    draw();
    return () => {
      running = false;
    };
  }, [id, fftSize, minDecibels, maxDecibels, smoothing]);

  return (
    <Stack gap={4}>
      <Stack direction="row" gap={2} align="end">
        <SelectField
          value={fftSize}
          schema={schema.fftSize}
          onChange={updateProp("fftSize")}
          className="w-28"
        />
        <InputField
          value={minDecibels}
          schema={schema.minDecibels}
          onChange={updateProp("minDecibels")}
        />
        <InputField
          value={maxDecibels}
          schema={schema.maxDecibels}
          onChange={updateProp("maxDecibels")}
        />
        <InputField
          value={smoothing}
          schema={schema.smoothing}
          onChange={updateProp("smoothing")}
        />
      </Stack>
      <Surface tone="panel" border="subtle" radius="md" className="w-fit p-1">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="h-[160px] w-[360px] rounded"
        />
      </Surface>
    </Stack>
  );
};

export default Spectrum;
