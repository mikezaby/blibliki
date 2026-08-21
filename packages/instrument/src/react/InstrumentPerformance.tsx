import {
  Engine,
  MidiEvent,
  ModuleType,
  TransportState,
} from "@blibliki/engine";
import { Button, Surface, Text, cn } from "@blibliki/ui";
import { Maximize2, Minimize2, Play, Square } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  createInstrumentControllerSession,
  type InstrumentControllerSession,
} from "@/InstrumentSession";
import type { InstrumentPersistenceAction } from "@/InstrumentSessionPersistence";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import type {
  BandSection,
  InstrumentDisplayState,
} from "@/display/InstrumentDisplayState";
import { createSavedInstrumentDocument } from "@/document/SavedInstrumentDocument";
import type { InstrumentDocument } from "@/document/types";

export type InstrumentPersistenceResult = {
  // Shown on the performance display once the action settles.
  notice?: InstrumentDisplayState["notice"];
  // Restarts the session on this document instead — how a discard/reload
  // swaps the live instrument for the stored one.
  document?: InstrumentDocument;
};

export type InstrumentPerformanceProps = {
  name: string;
  document: InstrumentDocument;
  // Rendered in the header beside the transport controls, for whatever way
  // back the host app has (a router link, a button, nothing at all).
  backSlot?: ReactNode;
  // Runs the controller's save/discard commands. The host owns storage: this
  // component only hands over the document as it stands and displays whatever
  // comes back.
  onPersist?: (
    action: InstrumentPersistenceAction,
    document: InstrumentDocument,
  ) =>
    | Promise<InstrumentPersistenceResult | undefined>
    | InstrumentPersistenceResult
    | undefined;
};

type PerformanceState = {
  displayState?: InstrumentDisplayState;
  engine?: Engine;
  controllerSession?: InstrumentControllerSession;
  error?: string;
  status: "loading" | "ready" | "error";
};

type SessionSource = {
  document: InstrumentDocument;
  initialDisplayNotice?: InstrumentDisplayState["notice"];
};

type BandCell =
  | InstrumentDisplayState["globalBand"]["slots"][number]
  | InstrumentDisplayState["upperBand"]["slots"][number];

type BandKey = "global" | "upper" | "lower";

type CellVisualValue = {
  kind: "number" | "enum" | "boolean" | "text";
  visualNormalized: number | null;
  // Position (0..1) the fill arc anchors at. Defaults to 0 (fill from min); a
  // bipolar range (min < 0 < max) anchors at the zero value so the arc fills
  // as a band from center toward the value.
  anchorNormalized?: number;
  showEncoder: boolean;
  empty: boolean;
};

const EMPTY_SLOT_TEXT = "--";
// The console is a faceplate, not a responsive page: it is laid out once at this
// width and then scaled as a whole to whatever screen it lands on. Nothing
// inside reflows, so an 8-encoder band stays an 8-encoder band on a phone.
const DESIGN_WIDTH = 1536;
// Every encoder rendered in the bands is a relative (incDec) mapping, so a
// gesture emits ticks around the pivot rather than an absolute position: 64
// means "no change", above counts up, below counts down.
const RELATIVE_PIVOT = 64;
const MAX_TICKS_PER_EVENT = 63;
// Drag distance that advances one tick. Small enough that a flick sweeps a
// range, large enough that a shaky finger does not.
const PIXELS_PER_TICK = 3;
const ENCODER_CENTER = 32;
const ENCODER_RADIUS = 24;
const ENCODER_START_ANGLE = 135;
const ENCODER_SWEEP_ANGLE = 270;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
) {
  if (stageWidth <= 0 || stageHeight <= 0 || contentHeight <= 0) {
    return { scale: 1, x: 0, y: 0 };
  }

  const scale = Math.min(
    stageWidth / DESIGN_WIDTH,
    stageHeight / contentHeight,
  );

  return {
    scale,
    x: (stageWidth - DESIGN_WIDTH * scale) / 2,
    y: (stageHeight - contentHeight * scale) / 2,
  };
}

export function createFaceplateStyle(fit: {
  scale: number;
  x: number;
  y: number;
}) {
  return {
    width: DESIGN_WIDTH,
    transformOrigin: "0 0",
    transform: `translate(${String(fit.x)}px, ${String(fit.y)}px) scale(${String(fit.scale)})`,
  };
}

function useFitToScreen(
  stageRef: RefObject<HTMLDivElement | null>,
  faceplateRef: RefObject<HTMLDivElement | null>,
) {
  const [fit, setFit] = useState({ scale: 1, x: 0, y: 0 });

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

function toRadians(angle: number) {
  return (angle * Math.PI) / 180;
}

function createEncoderPoint(radius: number, angle: number) {
  const radians = toRadians(angle);

  return {
    x: ENCODER_CENTER + radius * Math.cos(radians),
    y: ENCODER_CENTER + radius * Math.sin(radians),
  };
}

function formatPointValue(value: number) {
  return value.toFixed(2);
}

export function createEncoderArcPath(normalized: number | null, anchor = 0) {
  if (normalized === null) {
    return "";
  }

  const safeNormalized = clamp(normalized, 0, 1);
  const safeAnchor = clamp(anchor, 0, 1);
  const lo = Math.min(safeAnchor, safeNormalized);
  const hi = Math.max(safeAnchor, safeNormalized);
  if (hi - lo <= 0) {
    return "";
  }

  const start = createEncoderPoint(
    ENCODER_RADIUS,
    ENCODER_START_ANGLE + lo * ENCODER_SWEEP_ANGLE,
  );
  const end = createEncoderPoint(
    ENCODER_RADIUS,
    ENCODER_START_ANGLE + hi * ENCODER_SWEEP_ANGLE,
  );
  const largeArc = hi - lo > 2 / 3 ? 1 : 0;

  return `M ${formatPointValue(start.x)} ${formatPointValue(start.y)} A ${ENCODER_RADIUS} ${ENCODER_RADIUS} 0 ${largeArc} 1 ${formatPointValue(end.x)} ${formatPointValue(end.y)}`;
}

function createFullEncoderTrackPath() {
  const start = createEncoderPoint(ENCODER_RADIUS, ENCODER_START_ANGLE);
  const midpoint = createEncoderPoint(
    ENCODER_RADIUS,
    ENCODER_START_ANGLE + 180,
  );
  const end = createEncoderPoint(
    ENCODER_RADIUS,
    ENCODER_START_ANGLE + ENCODER_SWEEP_ANGLE,
  );

  return [
    `M ${formatPointValue(start.x)} ${formatPointValue(start.y)}`,
    `A ${ENCODER_RADIUS} ${ENCODER_RADIUS} 0 1 1 ${formatPointValue(midpoint.x)} ${formatPointValue(midpoint.y)}`,
    `A ${ENCODER_RADIUS} ${ENCODER_RADIUS} 0 0 1 ${formatPointValue(end.x)} ${formatPointValue(end.y)}`,
  ].join(" ");
}

const ENCODER_TRACK_PATH = createFullEncoderTrackPath();

function renderCellValue(slot: BandCell) {
  if ("kind" in slot && slot.kind === "empty") {
    return EMPTY_SLOT_TEXT;
  }

  return slot.valueText;
}

function renderCellLabel(slot: BandCell) {
  if ("kind" in slot && slot.kind === "empty") {
    return EMPTY_SLOT_TEXT;
  }

  return slot.shortLabel;
}

function isEmptyCell(slot: BandCell) {
  return "kind" in slot && slot.kind === "empty";
}

function isInactiveCell(slot: BandCell) {
  if (isEmptyCell(slot)) {
    return true;
  }

  return slot.inactive === true;
}

function normalizeNumericValue(value: number) {
  if (value >= 20 && value <= 20000) {
    return clamp(
      (Math.log10(value) - Math.log10(20)) /
        (Math.log10(20000) - Math.log10(20)),
      0,
      1,
    );
  }

  if (value >= 0 && value <= 1) {
    return value;
  }

  if (value >= 0 && value <= 100) {
    return value / 100;
  }

  if (value >= 0 && value <= 127) {
    return value / 127;
  }

  return 0.5;
}

function parseCellVisualValue(slot: BandCell): CellVisualValue {
  if (isEmptyCell(slot)) {
    return {
      kind: "text",
      visualNormalized: null,
      showEncoder: true,
      empty: true,
    };
  }

  const valueText = renderCellValue(slot);
  const trimmedValue = valueText.trim();
  if (trimmedValue === EMPTY_SLOT_TEXT) {
    return {
      kind: "text",
      visualNormalized: null,
      showEncoder: false,
      empty: false,
    };
  }

  if (
    slot.valueSpec?.kind === "boolean" &&
    typeof slot.rawValue === "boolean"
  ) {
    return {
      kind: "boolean",
      visualNormalized: slot.rawValue ? 1 : 0,
      showEncoder: false,
      empty: false,
    };
  }

  if (
    slot.valueSpec?.kind === "enum" &&
    (typeof slot.rawValue === "string" || typeof slot.rawValue === "number")
  ) {
    const optionIndex = slot.valueSpec.options.findIndex(
      (option) => option === slot.rawValue,
    );
    const optionCount = slot.valueSpec.options.length;

    return {
      kind: "enum",
      visualNormalized:
        optionIndex < 0 || optionCount <= 1
          ? 0.5
          : optionIndex / (optionCount - 1),
      showEncoder: false,
      empty: false,
    };
  }

  if (slot.valueSpec?.kind === "number" && typeof slot.rawValue === "number") {
    const { min, max, exp } = slot.valueSpec;
    if (min !== undefined && max !== undefined && min !== max) {
      const applyExp = (n: number) =>
        exp !== undefined && exp !== 1 ? Math.pow(n, 1 / exp) : n;
      const normalized = clamp((slot.rawValue - min) / (max - min), 0, 1);
      const bipolar = min < 0 && max > 0;

      return {
        kind: "number",
        visualNormalized: applyExp(normalized),
        anchorNormalized: bipolar ? applyExp((0 - min) / (max - min)) : 0,
        showEncoder: true,
        empty: false,
      };
    }

    return {
      kind: "number",
      visualNormalized: normalizeNumericValue(slot.rawValue),
      showEncoder: true,
      empty: false,
    };
  }

  const normalizedText = trimmedValue.toUpperCase();
  if (normalizedText === "ON" || normalizedText === "OFF") {
    return {
      kind: "boolean",
      visualNormalized: normalizedText === "ON" ? 1 : 0,
      showEncoder: false,
      empty: false,
    };
  }

  const percentMatch = trimmedValue.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    return {
      kind: "number",
      visualNormalized: clamp(Number(percentMatch[1]) / 100, 0, 1),
      showEncoder: true,
      empty: false,
    };
  }

  const bpmMatch = trimmedValue.match(/^(-?\d+(?:\.\d+)?)\s*BPM$/i);
  if (bpmMatch) {
    return {
      kind: "number",
      visualNormalized: clamp(Number(bpmMatch[1]) / 240, 0, 1),
      showEncoder: true,
      empty: false,
    };
  }

  const numericValue = Number(trimmedValue);
  if (Number.isFinite(numericValue)) {
    return {
      kind: "number",
      visualNormalized: normalizeNumericValue(numericValue),
      showEncoder: true,
      empty: false,
    };
  }

  return {
    kind: "enum",
    visualNormalized: 0.5,
    showEncoder: false,
    empty: false,
  };
}

function getCellCc(slot: BandCell) {
  return "cc" in slot ? slot.cc : undefined;
}

function getCellKey(slot: BandCell, bandKey: BandKey, index: number) {
  if (isEmptyCell(slot)) {
    return `${bandKey}-${index}`;
  }

  if ("blockKey" in slot) {
    return `${slot.blockKey}.${slot.slotKey}`;
  }

  return `global.${slot.key}`;
}

function getNoticeToneStyles(tone?: "info" | "success" | "warning" | "error") {
  switch (tone) {
    case "error":
      return "border-red-500/50 bg-red-950/60 text-red-100";
    case "success":
      return "border-emerald-500/35 bg-emerald-950/40 text-emerald-100";
    case "warning":
      return "border-amber-400/45 bg-amber-950/40 text-amber-100";
    default:
      return "border-zinc-700 bg-zinc-900/90 text-zinc-100";
  }
}

function ConsoleStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="px-4 py-3 shadow-inner">
      <Text
        asChild
        size="xs"
        className="font-mono uppercase tracking-[0.24em] text-zinc-500"
      >
        <span>{label}</span>
      </Text>
      <Text
        asChild
        className={cn(
          "mt-2 block font-mono text-base font-semibold uppercase tracking-[0.12em] text-zinc-50",
          valueClassName,
        )}
      >
        <span>{value}</span>
      </Text>
    </div>
  );
}

// Compact peak meter for the performance sidebar. Reuses the VuMeter engine
// module (its per-channel analysers) but renders minimally to match the console
// styling instead of the grid's chunky canvas.
const METER_MIN_DB = -60;
const METER_MAX_DB = 6; // headroom so 0 dBFS isn't pinned to the far edge
const METER_W = 240;
const METER_BAR_H = 9;
const METER_BAR_GAP = 6;
const METER_H = METER_BAR_H * 2 + METER_BAR_GAP;

function levelToDb(level: number) {
  return level > 0 ? 20 * Math.log10(level) : -Infinity;
}

function dbToFrac(db: number) {
  return Math.min(
    1,
    Math.max(0, (db - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB)),
  );
}

function drawMeter(
  canvas: HTMLCanvasElement | null,
  smoothed: [number, number],
) {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, METER_W, METER_H);

  const amber = dbToFrac(-14);
  const red = dbToFrac(0);
  const soft = 0.05;
  const gradient = ctx.createLinearGradient(0, 0, METER_W, 0);
  gradient.addColorStop(0, "#a3e635");
  gradient.addColorStop(amber - soft, "#a3e635");
  gradient.addColorStop(amber + soft, "#fbbf24");
  gradient.addColorStop(red - soft, "#fbbf24");
  gradient.addColorStop(red + soft, "#f87171");
  gradient.addColorStop(1, "#f87171");

  smoothed.forEach((level, ch) => {
    const y = ch * (METER_BAR_H + METER_BAR_GAP);
    ctx.fillStyle = "#27272a";
    ctx.fillRect(0, y, METER_W, METER_BAR_H);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, dbToFrac(levelToDb(level)) * METER_W, METER_BAR_H);
  });
}

function PerformanceMeter({
  engine,
  label,
  sourceModuleId,
  resetKey,
}: {
  engine: Engine;
  label: string;
  sourceModuleId: string;
  // Extra dependency that resets peak hold when it changes (e.g. active track),
  // even for a meter whose source module stays the same (like Master).
  resetKey: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  // Re-runs (and so resets peak hold) when the metered source or resetKey
  // changes, e.g. the performer selects a different track.
  useEffect(() => {
    let meterId: string | undefined;
    let routeId: string | undefined;
    try {
      meterId = engine.addModule({
        name: "Performance Meter",
        moduleType: ModuleType.VuMeter,
        props: {},
      }).id;
      routeId = engine.addRoute({
        source: { moduleId: sourceModuleId, ioName: "out" },
        destination: { moduleId: meterId, ioName: "in" },
      }).id;
    } catch {
      return;
    }

    let running = true;
    const smoothed: [number, number] = [0, 0];
    const hold: [number, number] = [0, 0]; // max since this source was selected

    const render = () => {
      if (!running || !meterId) return;

      const module = engine.findModule(meterId);
      if (module.moduleType === ModuleType.VuMeter) {
        const [peakL, peakR] = module.getPeaks();
        // Instant attack, smoothed release (matches the grid VuMeter ballistics).
        smoothed[0] = Math.max(peakL, 0.8 * smoothed[0]);
        smoothed[1] = Math.max(peakR, 0.8 * smoothed[1]);
        hold[0] = Math.max(hold[0], peakL);
        hold[1] = Math.max(hold[1], peakR);

        drawMeter(canvasRef.current, smoothed);

        if (readoutRef.current) {
          const db = levelToDb(Math.max(hold[0], hold[1]));
          readoutRef.current.textContent = Number.isFinite(db)
            ? `${db.toFixed(1)} dB`
            : "-∞ dB";
        }
      }

      requestAnimationFrame(render);
    };
    render();

    return () => {
      running = false;
      try {
        if (routeId) engine.removeRoute(routeId);
        if (meterId) engine.removeModule(meterId);
      } catch {
        // Engine may already be torn down on unmount.
      }
    };
  }, [engine, sourceModuleId, resetKey]);

  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
          {label}
        </span>
        <span
          ref={readoutRef}
          className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-300"
        >
          -∞ dB
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={METER_W}
        height={METER_H}
        className="mt-2 w-full"
        style={{ height: METER_H }}
      />
    </div>
  );
}

function EncoderGlyph({
  normalized,
  anchor,
  inactive,
  accent,
}: {
  normalized: number | null;
  anchor?: number;
  inactive: boolean;
  accent: boolean;
}) {
  const activeArcPath = createEncoderArcPath(normalized, anchor);

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="h-9 w-16 overflow-visible"
    >
      <path
        d={ENCODER_TRACK_PATH}
        fill="none"
        stroke={inactive ? "rgb(63 63 70 / 0.45)" : "rgb(113 113 122 / 0.5)"}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {activeArcPath ? (
        <path
          d={activeArcPath}
          fill="none"
          stroke={
            inactive
              ? "rgb(82 82 91 / 0.5)"
              : accent
                ? "rgb(232 121 249 / 0.95)"
                : "rgb(244 244 245 / 0.92)"
          }
          strokeWidth="4"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

function PerformanceBand({
  bandKey,
  sections,
  slots,
  onEncoderTick,
}: {
  bandKey: BandKey;
  sections: BandSection[];
  slots: readonly BandCell[];
  onEncoderTick?: (cc: number, ticks: number) => void;
}) {
  // Keyed by pointerId so two fingers can work two encoders at once, the way
  // two hands do on the hardware. Every cell shares these handlers and carries
  // its own CC in a data attribute, so nothing reads the ref during render.
  const dragsRef = useRef(new Map<number, { cc: number; lastY: number }>());

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragsRef.current.delete(event.pointerId);
  };

  const encoderHandlers = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      const cc = Number(event.currentTarget.dataset.cc);
      if (!Number.isFinite(cc)) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      dragsRef.current.set(event.pointerId, { cc, lastY: event.clientY });
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragsRef.current.get(event.pointerId);
      if (!drag) return;

      // Drag up to increase. Only whole ticks are sent; the leftover pixels
      // stay on the origin so a slow drag accumulates instead of rounding to
      // nothing every frame.
      const ticks = Math.trunc((drag.lastY - event.clientY) / PIXELS_PER_TICK);
      if (ticks === 0) return;

      drag.lastY -= ticks * PIXELS_PER_TICK;
      onEncoderTick?.(drag.cc, ticks);
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      const ticks =
        event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
      const cc = Number(event.currentTarget.dataset.cc);
      if (ticks === 0 || !Number.isFinite(cc)) return;

      event.preventDefault();
      onEncoderTick?.(cc, ticks);
    },
  };

  return (
    <section className="rounded-3xl bg-zinc-950/80 p-4 shadow-inner">
      <div className="flex items-center gap-4">
        {sections.map((section, i) => {
          const nextStart = sections[i + 1]?.startIndex ?? slots.length;
          const count = nextStart - section.startIndex;
          return (
            <div
              key={section.startIndex}
              style={{ flex: count }}
              className="flex items-center gap-3 min-w-0"
            >
              <Text
                asChild
                size="xs"
                className="font-mono uppercase tracking-[0.3em] text-zinc-500 shrink-0"
              >
                <span>{section.label}</span>
              </Text>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-8 gap-3">
        {slots.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 px-4 py-6">
            <Text
              asChild
              size="xs"
              className="font-mono uppercase tracking-[0.24em] text-zinc-500"
            >
              <span>No mapped controls on this band.</span>
            </Text>
          </div>
        ) : (
          slots.map((slot, index) => {
            const inactive = isInactiveCell(slot);
            const visual = parseCellVisualValue(slot);
            const slotKey = getCellKey(slot, bandKey, index);
            const cc = getCellCc(slot);
            // Inactive cells stay playable: the hardware sends their CC too,
            // and the surface reducer is what decides to ignore it.
            const playable = cc !== undefined && onEncoderTick !== undefined;

            return (
              <div
                key={`${bandKey}-${index}-${renderCellLabel(slot)}`}
                data-slot-key={slotKey}
                data-slot-layout={visual.showEncoder ? "encoder" : "text"}
                data-cc={cc}
                {...(playable ? encoderHandlers : undefined)}
                role={playable ? "slider" : undefined}
                tabIndex={playable ? 0 : undefined}
                aria-label={playable ? renderCellLabel(slot) : undefined}
                aria-valuenow={
                  playable ? (visual.visualNormalized ?? 0) : undefined
                }
                aria-valuemin={playable ? 0 : undefined}
                aria-valuemax={playable ? 1 : undefined}
                aria-valuetext={playable ? renderCellValue(slot) : undefined}
                className={cn(
                  "rounded-2xl px-3 py-4 transition-colors",
                  inactive
                    ? "bg-zinc-950/30 text-zinc-600"
                    : "bg-zinc-900/35 text-zinc-50",
                  // touch-none keeps a drag from scrolling the page on mobile.
                  playable &&
                    "cursor-ns-resize touch-none select-none focus-visible:ring-2",
                )}
              >
                <Text
                  asChild
                  size="xs"
                  className={cn(
                    "block text-center font-mono uppercase tracking-[0.2em]",
                    inactive ? "text-zinc-700" : "text-zinc-500",
                  )}
                >
                  <span>{renderCellLabel(slot)}</span>
                </Text>

                <div
                  className={cn(
                    "mt-3 flex min-h-[4.75rem] w-full",
                    visual.showEncoder
                      ? "flex-col items-center justify-between gap-2"
                      : "items-center justify-center",
                  )}
                >
                  {visual.showEncoder ? (
                    <EncoderGlyph
                      normalized={visual.visualNormalized}
                      anchor={visual.anchorNormalized}
                      inactive={inactive}
                      accent={bandKey === "upper" && !visual.empty}
                    />
                  ) : null}
                  <Text
                    asChild
                    className={cn(
                      "block text-center font-mono font-semibold uppercase",
                      visual.showEncoder
                        ? "text-lg tracking-[0.06em]"
                        : "text-xl tracking-[0.12em]",
                      inactive ? "text-zinc-500" : "text-zinc-100",
                    )}
                  >
                    <span>{renderCellValue(slot)}</span>
                  </Text>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function StatusLamp({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full border",
          active
            ? "border-lime-300/80 bg-lime-300 shadow-sm"
            : "border-zinc-700 bg-zinc-900",
        )}
      />
      <Text
        asChild
        size="xs"
        className="font-mono uppercase tracking-[0.2em] text-zinc-500"
      >
        <span>{label}</span>
      </Text>
    </div>
  );
}

function formatTrackVolume(volume?: number) {
  return volume === undefined ? "--" : `${volume.toFixed(1)} dB`;
}

function downloadWav(blob: Blob, instrumentName: string) {
  if (typeof document === "undefined") return;

  const safeName =
    instrumentName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") ||
    "instrument";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}-${stamp}.wav`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function InstrumentPerformance({
  name,
  document: instrumentDocument,
  backSlot,
  onPersist,
}: InstrumentPerformanceProps) {
  const [sessionSource, setSessionSource] = useState<SessionSource>({
    document: instrumentDocument,
  });
  const [state, setState] = useState<PerformanceState>({
    status: "loading",
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const documentRef = useRef(instrumentDocument);
  const stageRef = useRef<HTMLDivElement>(null);
  const faceplateRef = useRef<HTMLDivElement>(null);
  const fit = useFitToScreen(stageRef, faceplateRef);

  useEffect(() => {
    let cancelled = false;
    let engineInstance: Engine | undefined;
    let controllerSessionInstance: InstrumentControllerSession | undefined;

    const setup = async () => {
      try {
        documentRef.current = sessionSource.document;
        const runtimePatch = createInstrumentEnginePatch(
          sessionSource.document,
        );
        const engine = await Engine.load(runtimePatch.patch);
        const controllerSession = createInstrumentControllerSession(
          engine,
          runtimePatch,
          {
            initialDisplayNotice: sessionSource.initialDisplayNotice,
            onDisplayStateChange: (displayState) => {
              if (cancelled) {
                return;
              }

              setState((current) => ({
                ...current,
                displayState,
                status: "ready",
              }));
            },
            onRuntimePatchChange: (nextRuntimePatch) => {
              documentRef.current = createSavedInstrumentDocument(
                documentRef.current,
                nextRuntimePatch,
                engine.serialize(),
              );
            },
            onPersistenceAction: async (action, nextRuntimePatch) => {
              const savedDocument = createSavedInstrumentDocument(
                documentRef.current,
                nextRuntimePatch,
                engine.serialize(),
              );
              documentRef.current = savedDocument;

              const result = await onPersist?.(action, savedDocument);
              if (!result?.document) {
                return result?.notice;
              }

              // The host swapped in a different document, so the session is
              // rebuilt on it and the notice rides along to the fresh display.
              documentRef.current = result.document;
              setSessionSource({
                document: result.document,
                initialDisplayNotice: result.notice,
              });

              return undefined;
            },
          },
        );

        engineInstance = engine;
        controllerSessionInstance = controllerSession;

        // Auto-download the session recording when it stops (browser only).
        if (engine.sessionRecorderId) {
          const recorder = engine.findModule(engine.sessionRecorderId);
          if (recorder.moduleType === ModuleType.AudioRecorder) {
            recorder.onRecordingComplete = (blob) => {
              downloadWav(blob, name);
            };
          }
        }

        if (cancelled) {
          controllerSession.dispose();
          engine.dispose();
          await engine.context.close();
          return;
        }

        setState({
          status: "ready",
          engine,
          controllerSession,
          displayState: controllerSession.getDisplayState(),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void setup();

    return () => {
      cancelled = true;
      controllerSessionInstance?.dispose();
      engineInstance?.dispose();
      void engineInstance?.context.close();
    };
  }, [sessionSource, name, onPersist]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === document.documentElement);
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  const displayState = state.displayState;
  // Source outputs to meter, derived from the live runtime patch so the track
  // meter follows the active track (changing it resets that meter's peak hold).
  const runtimePatch = state.controllerSession?.getRuntimePatch();
  const masterTrackKey = runtimePatch?.compiledInstrument.tracks.find(
    (track) => track.audioSource.type === "master",
  )?.key;
  const masterMeterSourceId = masterTrackKey
    ? `${masterTrackKey}.trackGain.main`
    : undefined;
  const activeTrack = runtimePatch
    ? runtimePatch.compiledInstrument.tracks[
        runtimePatch.runtime.navigation.activeTrackIndex
      ]
    : undefined;
  const trackMeterSourceId = activeTrack
    ? `${activeTrack.key}.trackGain.main`
    : undefined;
  const pageBankLabel = displayState
    ? `${displayState.upperBand.title} / ${displayState.lowerBand.title}`
    : "--";
  const trackName = displayState?.header.trackName ?? "Waiting for runtime";
  const trackVolume = formatTrackVolume(displayState?.header.trackVolume);
  const isTransportRunning =
    displayState?.header.transportState === TransportState.playing;
  const isSequencerEdit = displayState?.header.mode === "seqEdit";
  const canToggleFullscreen =
    typeof document !== "undefined" &&
    typeof document.exitFullscreen === "function" &&
    typeof HTMLElement !== "undefined" &&
    typeof document.documentElement.requestFullscreen === "function";

  const sendEncoderTick = (cc: number, ticks: number) => {
    const { controllerSession, engine } = state;
    if (!controllerSession || !engine) {
      return;
    }

    const ccValue =
      RELATIVE_PIVOT + clamp(ticks, -MAX_TICKS_PER_EVENT, MAX_TICKS_PER_EVENT);

    controllerSession.sendControlEvent(
      MidiEvent.fromCC(cc, ccValue, engine.context.currentTime),
    );
  };

  const handleFullscreenToggle = async () => {
    if (!canToggleFullscreen) {
      return;
    }

    if (document.fullscreenElement === document.documentElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  };

  return (
    <Surface
      tone="canvas"
      ref={stageRef}
      // The console is a dark faceplate — every colour it sets itself is a
      // fixed zinc — but its stage, faceplate and display chrome are built from
      // @blibliki/ui tokens, which follow the host's light/dark setting. Left to
      // the host, the same console renders one way in grid (which puts `dark` on
      // the root) and another in the mobile app (which does not). Declaring the
      // mode here makes the chrome match the rest of the console everywhere.
      data-theme="dark"
      className="instrument-performance-stage fixed inset-0 overflow-hidden bg-zinc-950"
    >
      <div
        ref={faceplateRef}
        className="absolute left-0 top-0"
        style={createFaceplateStyle(fit)}
      >
        <div className="rounded-3xl bg-zinc-900/90 p-5 shadow-2xl">
          <div className="instrument-performance-faceplate rounded-3xl p-6">
            <div className="flex flex-row items-start justify-between gap-6">
              <div className="max-w-3xl">
                <Text
                  asChild
                  weight="semibold"
                  className="instrument-performance-title block font-mono text-2xl uppercase leading-tight tracking-[0.22em] text-zinc-300"
                >
                  <h1>{name}</h1>
                </Text>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  <StatusLamp active={isTransportRunning} label="Transport" />
                  <StatusLamp active={isSequencerEdit} label="Step Edit" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {backSlot}
                <Button
                  variant="outlined"
                  color="neutral"
                  disabled={!canToggleFullscreen}
                  onClick={() => {
                    void handleFullscreenToggle();
                  }}
                  className="rounded-full border-zinc-600 px-5 font-mono uppercase tracking-[0.14em] text-zinc-200 hover:border-zinc-400 hover:bg-zinc-900"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </Button>
                <Button
                  color="neutral"
                  disabled={state.status !== "ready" || !state.engine}
                  onClick={() => {
                    if (isTransportRunning) {
                      state.engine?.stop();
                      return;
                    }

                    void state.engine?.start();
                  }}
                  className="rounded-full border border-zinc-600 bg-zinc-50 px-5 font-mono uppercase tracking-[0.14em] text-zinc-950 shadow-[0_6px_20px_rgba(255,255,255,0.08)]"
                >
                  {isTransportRunning ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                  {isTransportRunning ? "Stop" : "Start"}
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-[18rem_minmax(0,1fr)] gap-5">
              <aside>
                <ConsoleStat label="Track" value={trackName} />
                <ConsoleStat label="Track Volume" value={trackVolume} />
                <ConsoleStat
                  label="Page Bank"
                  value={pageBankLabel}
                  valueClassName="text-sm"
                />
                <ConsoleStat
                  label="MIDI"
                  value={
                    displayState
                      ? `Channel ${displayState.header.midiChannel}`
                      : "--"
                  }
                />
                {state.engine && masterMeterSourceId ? (
                  <PerformanceMeter
                    engine={state.engine}
                    label="Master"
                    sourceModuleId={masterMeterSourceId}
                    resetKey={activeTrack?.key ?? ""}
                  />
                ) : null}
                {state.engine && trackMeterSourceId ? (
                  <PerformanceMeter
                    engine={state.engine}
                    label="Track"
                    sourceModuleId={trackMeterSourceId}
                    resetKey={activeTrack?.key ?? ""}
                  />
                ) : null}
              </aside>

              <div className="instrument-performance-display">
                <div className="relative z-10">
                  {state.status === "loading" ? (
                    <div className="px-5 py-10">
                      <Text
                        asChild
                        className="font-mono text-lg uppercase tracking-[0.18em] text-lime-100"
                      >
                        <h2>Booting Runtime</h2>
                      </Text>
                      <Text
                        asChild
                        className="mt-3 block font-mono text-sm uppercase tracking-[0.12em] text-zinc-500"
                      >
                        <p>
                          Initializing engine, MIDI devices, and controller
                          session.
                        </p>
                      </Text>
                    </div>
                  ) : null}

                  {state.status === "error" ? (
                    <div className="rounded-3xl border border-red-500/40 bg-red-950/40 px-5 py-10">
                      <Text
                        asChild
                        className="font-mono text-lg uppercase tracking-[0.18em] text-red-50"
                      >
                        <h2>Runtime Fault</h2>
                      </Text>
                      <Text
                        asChild
                        className="mt-3 block font-mono text-sm uppercase tracking-[0.12em] text-red-200/80"
                      >
                        <p>{state.error}</p>
                      </Text>
                    </div>
                  ) : null}

                  {displayState ? (
                    <div className="space-y-4">
                      {displayState.notice ? (
                        <div
                          className={cn(
                            "rounded-2xl border px-4 py-3 shadow-inner",
                            getNoticeToneStyles(displayState.notice.tone),
                          )}
                        >
                          <Text
                            asChild
                            className="font-mono text-sm font-semibold uppercase tracking-[0.16em]"
                          >
                            <span>{displayState.notice.title}</span>
                          </Text>
                          {displayState.notice.message ? (
                            <Text
                              asChild
                              className="mt-2 block font-mono text-xs uppercase tracking-[0.1em] opacity-80"
                            >
                              <span>{displayState.notice.message}</span>
                            </Text>
                          ) : null}
                        </div>
                      ) : null}

                      <PerformanceBand
                        bandKey="global"
                        sections={[{ label: "Global Controls", startIndex: 0 }]}
                        slots={displayState.globalBand.slots}
                        onEncoderTick={sendEncoderTick}
                      />
                      <PerformanceBand
                        bandKey="upper"
                        sections={displayState.upperBand.sections}
                        slots={displayState.upperBand.slots}
                        onEncoderTick={sendEncoderTick}
                      />
                      <PerformanceBand
                        bandKey="lower"
                        sections={displayState.lowerBand.sections}
                        slots={displayState.lowerBand.slots}
                        onEncoderTick={sendEncoderTick}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}
