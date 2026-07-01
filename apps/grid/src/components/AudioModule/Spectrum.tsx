import { Engine, moduleSchemas, ModuleType } from "@blibliki/engine";
import { Stack, Surface } from "@blibliki/ui";
import { requestAnimationFrame } from "@blibliki/utils";
import { useEffect, useRef } from "react";
import { ModuleComponent } from ".";
import { InputField, SelectField } from "./attributes/Field";

const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 200;
const PAD_LEFT = 30; // dB labels
const PAD_TOP = 12; // frequency labels
const PAD_RIGHT = 8;
const PAD_BOTTOM = 6;
const PLOT_X = PAD_LEFT;
const PLOT_Y = PAD_TOP;
const PLOT_W = CANVAS_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = CANVAS_HEIGHT - PAD_TOP - PAD_BOTTOM;

const F_MIN = 20;
const F_MAX = 20000;
const DB_STEP = 12;

// Log frequency axis.
const freqToX = (f: number): number =>
  PLOT_X + (Math.log10(f / F_MIN) / Math.log10(F_MAX / F_MIN)) * PLOT_W;

const FREQ_MINOR = [
  30, 40, 50, 60, 70, 80, 90, 200, 300, 400, 500, 600, 700, 800, 900, 2000,
  3000, 4000, 5000, 6000, 7000, 8000, 9000, 20000,
];
const FREQ_MAJOR: [number, string][] = [
  [100, "100"],
  [1000, "1k"],
  [10000, "10k"],
];

type SpectrumColors = {
  line: string;
  grid: string;
  text: string;
  bg: string;
};

const readColors = (el: HTMLElement): SpectrumColors => {
  const styles = getComputedStyle(el);
  const v = (name: string) => styles.getPropertyValue(name).trim();
  return {
    line: v("--ui-color-info-500"),
    grid: v("--ui-color-border-subtle"),
    text: v("--ui-color-text-muted"),
    bg: v("--ui-color-surface-2"),
  };
};

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
    let colors: SpectrumColors | null = null;

    const dbToY = (db: number): number => {
      const c = Math.min(maxDecibels, Math.max(minDecibels, db));
      return (
        PLOT_Y + ((maxDecibels - c) / (maxDecibels - minDecibels)) * PLOT_H
      );
    };

    function drawGrid(ctx: CanvasRenderingContext2D, c: SpectrumColors) {
      ctx.fillStyle = c.bg;
      ctx.fillRect(PLOT_X, PLOT_Y, PLOT_W, PLOT_H);

      ctx.strokeStyle = c.grid;
      ctx.fillStyle = c.text;
      ctx.lineWidth = 1;
      ctx.font = "9px monospace";

      // Frequency grid (vertical, log-spaced).
      ctx.globalAlpha = 0.3;
      for (const f of FREQ_MINOR) {
        const x = freqToX(f);
        ctx.beginPath();
        ctx.moveTo(x, PLOT_Y);
        ctx.lineTo(x, PLOT_Y + PLOT_H);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.6;
      ctx.textAlign = "center";
      for (const [f, label] of FREQ_MAJOR) {
        const x = freqToX(f);
        ctx.beginPath();
        ctx.moveTo(x, PLOT_Y);
        ctx.lineTo(x, PLOT_Y + PLOT_H);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillText(label, x, PLOT_Y - 3);
        ctx.globalAlpha = 0.6;
      }

      // dB grid (horizontal).
      ctx.textAlign = "right";
      const startDb = Math.ceil(minDecibels / DB_STEP) * DB_STEP;
      for (let db = startDb; db <= maxDecibels; db += DB_STEP) {
        const y = dbToY(db);
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(PLOT_X, y);
        ctx.lineTo(PLOT_X + PLOT_W, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillText(String(db), PLOT_X - 4, y + 3);
      }
      ctx.globalAlpha = 1;
    }

    function drawSpectrum(
      ctx: CanvasRenderingContext2D,
      c: SpectrumColors,
      values: Float32Array,
      sampleRate: number,
    ) {
      const bins = values.length;

      ctx.beginPath();
      for (let x = 0; x <= PLOT_W; x++) {
        const f = F_MIN * Math.pow(F_MAX / F_MIN, x / PLOT_W);
        let bin = Math.round((f * fftSize) / sampleRate);
        if (bin < 0) bin = 0;
        if (bin > bins - 1) bin = bins - 1;
        const raw = values[bin];
        const db =
          raw !== undefined && Number.isFinite(raw) ? raw : minDecibels;
        const px = PLOT_X + x;
        const y = dbToY(db);
        if (x === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }

      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.stroke();

      // Subtle fill under the curve.
      ctx.lineTo(PLOT_X + PLOT_W, PLOT_Y + PLOT_H);
      ctx.lineTo(PLOT_X, PLOT_Y + PLOT_H);
      ctx.closePath();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = c.line;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

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
        colors ??= readColors(canvas);
        const sampleRate = Engine.current.context.audioContext.sampleRate;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawGrid(ctx, colors);
        drawSpectrum(ctx, colors, module.getFrequencies(), sampleRate);
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
          className="h-[200px] w-[420px] rounded"
        />
      </Surface>
    </Stack>
  );
};

export default Spectrum;
