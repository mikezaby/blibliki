import { Engine, ModuleType } from "@blibliki/engine";
import { Stack, Surface } from "@blibliki/ui";
import { requestAnimationFrame } from "@blibliki/utils";
import { useEffect, useRef } from "react";
import { ModuleComponent } from ".";

const CANVAS_WIDTH = 96;
const CANVAS_HEIGHT = 220;
const METER_TOP = 16;
const METER_BOTTOM = 184;

const BARS_LEFT = 22;
const BARS_RIGHT = 86;
const MID = (BARS_LEFT + BARS_RIGHT) / 2;
const DIVIDER = 2; // very small gap between the two channels
const LEFT_X = BARS_LEFT;
const LEFT_W = MID - DIVIDER / 2 - BARS_LEFT;
const RIGHT_X = MID + DIVIDER / 2;
const RIGHT_W = BARS_RIGHT - RIGHT_X;

const MIN_DB = -60;
const MAX_DB = 6; // headroom above 0 dBFS so the 0 dB line is visible

const dbToY = (db: number): number => {
  const frac = (db - MIN_DB) / (MAX_DB - MIN_DB);
  const clamped = Math.min(1, Math.max(0, frac));
  return METER_BOTTOM - clamped * (METER_BOTTOM - METER_TOP);
};

// Peak meter: sample peak in dBFS, full scale (1.0) = 0 dB. No calibration —
// this measures clipping/headroom, not loudness.
const levelToDb = (level: number): number =>
  level > 0 ? 20 * Math.log10(level) : -Infinity;

type MeterColors = {
  track: string;
  divider: string;
  text: string;
  low: string;
  mid: string;
  high: string;
};

// Canvas can't use CSS classes, so resolve the theme tokens to concrete values.
const readColors = (el: HTMLElement): MeterColors => {
  const styles = getComputedStyle(el);
  const v = (name: string) => styles.getPropertyValue(name).trim();
  return {
    track: v("--ui-color-surface-2"),
    divider: v("--ui-color-border-subtle"),
    text: v("--ui-color-text-secondary"),
    low: v("--ui-color-success-500"),
    mid: v("--ui-color-warning-500"),
    high: v("--ui-color-error-500"),
  };
};

const VuMeter: ModuleComponent<ModuleType.VuMeter> = (props) => {
  const {
    id,
    props: { smoothing },
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothedRef = useRef<[number, number]>([0, 0]);
  const holdRef = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    let running = true;
    let colors: MeterColors | null = null;

    function drawChannel(
      ctx: CanvasRenderingContext2D,
      colors: MeterColors,
      x: number,
      w: number,
      level: number,
    ) {
      ctx.fillStyle = colors.track;
      ctx.fillRect(x, METER_TOP, w, METER_BOTTOM - METER_TOP);

      // Mostly solid zones with a small transition band, keyed to dB thresholds:
      // green (safe) → amber (hot, ~-14 dB) → red (clip, 0 dBFS).
      const stopAt = (db: number) => (db - MIN_DB) / (MAX_DB - MIN_DB);
      const amber = stopAt(-14);
      const red = stopAt(0);
      const soft = 0.07; // small blend straddling each threshold (before + after)
      const gradient = ctx.createLinearGradient(0, METER_BOTTOM, 0, METER_TOP);
      gradient.addColorStop(0, colors.low);
      gradient.addColorStop(amber - soft, colors.low);
      gradient.addColorStop(amber + soft, colors.mid);
      gradient.addColorStop(red - soft, colors.mid);
      gradient.addColorStop(red + soft, colors.high);
      gradient.addColorStop(1, colors.high);

      const y = dbToY(levelToDb(level));
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, w, METER_BOTTOM - y);
    }

    function drawReadout(
      ctx: CanvasRenderingContext2D,
      colors: MeterColors,
      centerX: number,
      hold: number,
      clipped: boolean,
    ) {
      const db = levelToDb(hold);
      ctx.fillStyle = clipped ? colors.high : colors.text;
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        Number.isFinite(db) ? db.toFixed(1) : "-∞",
        centerX,
        CANVAS_HEIGHT - 8,
      );
    }

    function draw() {
      const module = Engine.current.findModule(id);
      if (module.moduleType !== ModuleType.VuMeter)
        throw Error("Not a vu meter module");

      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        requestAnimationFrame(draw);
        return;
      }

      const [peakL, peakR] = module.getPeaks();
      const smoothed = smoothedRef.current;
      const hold = holdRef.current;
      // Peak ballistics: instant attack, smoothed release.
      smoothed[0] = Math.max(peakL, smoothing * smoothed[0]);
      smoothed[1] = Math.max(peakR, smoothing * smoothed[1]);
      hold[0] = Math.max(hold[0], peakL);
      hold[1] = Math.max(hold[1], peakR);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        colors ??= readColors(canvas);
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        drawChannel(ctx, colors, LEFT_X, LEFT_W, smoothed[0]);
        drawChannel(ctx, colors, RIGHT_X, RIGHT_W, smoothed[1]);

        // Divider between the channels.
        ctx.fillStyle = colors.divider;
        ctx.fillRect(
          MID - DIVIDER / 2,
          METER_TOP,
          DIVIDER,
          METER_BOTTOM - METER_TOP,
        );

        // 0 dBFS clip line spanning both channels; red once either has gone over.
        const clippedL = hold[0] >= 1;
        const clippedR = hold[1] >= 1;
        const y0 = dbToY(0);
        ctx.strokeStyle = clippedL || clippedR ? colors.high : colors.text;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(BARS_LEFT - 6, y0);
        ctx.lineTo(BARS_RIGHT, y0);
        ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = "10px monospace";
        ctx.textAlign = "right";
        ctx.fillText("0", BARS_LEFT - 8, y0 + 3);

        // Per-channel peak-hold readouts.
        drawReadout(ctx, colors, LEFT_X + LEFT_W / 2, hold[0], clippedL);
        drawReadout(ctx, colors, RIGHT_X + RIGHT_W / 2, hold[1], clippedR);
      }

      requestAnimationFrame(draw);
    }

    draw();
    return () => {
      running = false;
    };
  }, [id, smoothing]);

  return (
    <Stack gap={4}>
      <Surface tone="panel" border="subtle" radius="md" className="w-fit p-1">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="h-[220px] w-[96px] rounded"
          title="Click the readout to reset peak hold"
          onClick={(e) => {
            // Reset both channels' peak hold when the readout is clicked.
            if (e.nativeEvent.offsetY >= METER_BOTTOM) holdRef.current = [0, 0];
          }}
        />
      </Surface>
    </Stack>
  );
};

export default VuMeter;
