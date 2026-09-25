import {
  Engine,
  MidiEvent,
  ModuleType,
  TransportState,
} from "@blibliki/engine";
import { Button, IconButton, Logo, Surface, Text, cn } from "@blibliki/ui";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Eraser,
  Maximize2,
  Minimize2,
  Play,
  Settings,
  Square,
} from "lucide-react";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
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
import { STEP_BY_STEP_GROUPS, type InstrumentHint } from "@/display/hints";
import { createSavedInstrumentDocument } from "@/document/SavedInstrumentDocument";
import type { InstrumentDocument } from "@/document/types";
import ConsoleSettings from "./ConsoleSettings";
import EncoderGlyph from "./EncoderGlyph";
import {
  getCellCc,
  getCellKey,
  isInactiveCell,
  parseCellVisualValue,
  renderCellLabel,
  renderCellValue,
  type BandCell,
  type BandKey,
} from "./bandCell";
import { createFaceplateStyle, useFitToScreen } from "./faceplateFit";
import { useFullscreen } from "./fullscreen";
import {
  loadMidiRecordingSettings,
  saveMidiRecordingSettings,
} from "./recordingSettingsStore";

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
  // Whether a fullscreen control belongs here at all. Feature detection only
  // answers whether fullscreen would work, which it does in any browser tab;
  // whether it is worth offering is the host's to say. An installed app is
  // already fullscreen and passes false.
  allowFullscreen?: boolean;
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

// The navigation buttons on a Launch Control XL3. On-screen prev/next plays the
// same CCs, so navigation, LED sync and display all follow one path whether the
// performer used the hardware or the screen.
const TRACK_PREV_CC = 103;
const TRACK_NEXT_CC = 102;
const PAGE_PREV_CC = 107;
const PAGE_NEXT_CC = 106;
const PLAY_CC = 116;
const SHIFT_CC = 63;
// Those buttons are momentary: the surface acts on the press, not the release.
// Shift is the exception, so the screen sends its release too.
const BUTTON_PRESS_VALUE = 127;
const BUTTON_RELEASE_VALUE = 0;
// Every encoder rendered in the bands is a relative (incDec) mapping, so a
// gesture emits ticks around the pivot rather than an absolute position: 64
// means "no change", above counts up, below counts down.
const RELATIVE_PIVOT = 64;
const MAX_TICKS_PER_EVENT = 63;
// Drag distance that advances one tick. Small enough that a flick sweeps a
// range, large enough that a shaky finger does not.
const PIXELS_PER_TICK = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function StepButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="outlined"
      color="neutral"
      size="icon"
      aria-label={label}
      onClick={onPress}
      // Full height of the row it sits in and wide enough for a thumb: the
      // whole console is scaled down on a handheld, so a control sized for a
      // mouse ends up around a third of its drawn size.
      className="h-auto min-h-16 w-14 self-stretch rounded-2xl border-zinc-700 text-zinc-300"
    >
      {children}
    </Button>
  );
}

function ConsoleStat({
  label,
  value,
  valueClassName,
  onPrevious,
  onNext,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const navigable = onPrevious && onNext;

  return (
    <div className="flex items-stretch gap-3 px-4 py-3 shadow-inner">
      {navigable ? (
        <StepButton
          label={`Previous ${label.toLowerCase()}`}
          onPress={onPrevious}
        >
          <ChevronLeft className="h-6 w-6" />
        </StepButton>
      ) : null}

      {/* Centred so the readout sits balanced between the two buttons, and
          centred vertically because they are taller than the text is. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center text-center">
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

      {navigable ? (
        <StepButton label={`Next ${label.toLowerCase()}`} onPress={onNext}>
          <ChevronRight className="h-6 w-6" />
        </StepButton>
      ) : null}
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

function PerformanceBand({
  bandKey,
  sections,
  slots,
  rotated,
  onEncoderTick,
}: {
  bandKey: BandKey;
  sections: BandSection[];
  slots: readonly BandCell[];
  rotated: boolean;
  onEncoderTick?: (cc: number, ticks: number) => void;
}) {
  // Turning an encoder up means dragging up the faceplate, which is up the
  // screen normally and to the right once the console is rotated a quarter
  // turn. Negating x keeps "further along" meaning "more" either way.
  const dragPosition = (event: PointerEvent<HTMLDivElement>) =>
    rotated ? -event.clientX : event.clientY;

  // Keyed by pointerId so two fingers can work two encoders at once, the way
  // two hands do on the hardware. Every cell shares these handlers and carries
  // its own CC in a data attribute, so nothing reads the ref during render.
  const dragsRef = useRef(new Map<number, { cc: number; last: number }>());

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragsRef.current.delete(event.pointerId);
  };

  const encoderHandlers = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      const cc = Number(event.currentTarget.dataset.cc);
      if (!Number.isFinite(cc)) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      dragsRef.current.set(event.pointerId, { cc, last: dragPosition(event) });
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragsRef.current.get(event.pointerId);
      if (!drag) return;

      // Drag up to increase. Only whole ticks are sent; the leftover pixels
      // stay on the origin so a slow drag accumulates instead of rounding to
      // nothing every frame.
      const ticks = Math.trunc(
        (drag.last - dragPosition(event)) / PIXELS_PER_TICK,
      );
      if (ticks === 0) return;

      drag.last -= ticks * PIXELS_PER_TICK;
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

// Covers the bands rather than pushing them down, so holding Shift to read
// does not rescale the whole console.
function CheatSheet({
  title,
  hints,
}: {
  title: string;
  hints: InstrumentHint[];
}) {
  return (
    <section
      aria-label="Cheatsheet"
      className="absolute inset-0 z-20 overflow-hidden rounded-3xl bg-zinc-950 p-5 shadow-2xl"
    >
      <Text
        asChild
        size="xs"
        className="font-mono uppercase tracking-[0.3em] text-zinc-500"
      >
        <h2>{title}</h2>
      </Text>
      {/* Two balanced columns, each group kept whole. */}
      <div className="mt-4 columns-2 gap-10">
        {groupHints(hints).map(([group, groupHints]) => (
          <section key={group} className="mb-5 break-inside-avoid">
            <Text
              asChild
              size="xs"
              className="font-mono uppercase tracking-[0.24em] text-zinc-400"
            >
              <h3>{group}</h3>
            </Text>
            {/* Gestures in one column, what they do in the next, so a group
                reads as a table. */}
            <dl className="mt-2 grid grid-cols-[max-content_1fr] items-baseline gap-x-6 gap-y-1.5">
              {groupHints.map((hint, index) => (
                <Fragment key={hint.action}>
                  <dt className="text-sm leading-7 text-zinc-400">
                    {STEP_BY_STEP_GROUPS.has(hint.group) ? (
                      <span className="mr-2 font-mono text-zinc-500">
                        {index + 1}
                      </span>
                    ) : null}
                    <GestureKeys gesture={hint.gesture} />
                  </dt>
                  <dd className="text-base leading-7 text-zinc-100">
                    {hint.text}
                  </dd>
                </Fragment>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}

// A gesture names its controls in brackets. Each control renders as a key,
// the words between them stay plain text.
function GestureKeys({ gesture }: { gesture: string }) {
  return gesture
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("[") ? (
        <kbd
          key={index}
          className="inline-block rounded-md border border-zinc-600 bg-zinc-800 px-1.5 font-mono text-xs uppercase leading-5 text-lime-200"
        >
          {part.slice(1, -1)}
        </kbd>
      ) : (
        part
      ),
    );
}

// Keeps the groups in the order the hints list them.
function groupHints(hints: InstrumentHint[]) {
  const groups = new Map<string, InstrumentHint[]>();
  for (const hint of hints) {
    groups.set(hint.group, [...(groups.get(hint.group) ?? []), hint]);
  }

  return [...groups];
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
  allowFullscreen = true,
  onPersist,
}: InstrumentPerformanceProps) {
  const [sessionSource, setSessionSource] = useState<SessionSource>({
    document: instrumentDocument,
  });
  const [state, setState] = useState<PerformanceState>({
    status: "loading",
  });
  const [cheatsheetPinned, setCheatsheetPinned] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recordingSettings, setRecordingSettings] = useState(
    loadMidiRecordingSettings,
  );
  const fullscreen = useFullscreen(allowFullscreen);

  // The session records the way the settings say, and a change outlives the
  // page: the settings are the performer's, not the instrument's.
  useEffect(() => {
    state.controllerSession?.setRecordingSettings(recordingSettings);
    saveMidiRecordingSettings(recordingSettings);
  }, [state.controllerSession, recordingSettings]);

  // The ? key pins and unpins the cheatsheet, unless the performer is typing.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key !== "?" || typing) {
        return;
      }

      event.preventDefault();
      setCheatsheetPinned((pinned) => !pinned);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
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
  const isSequencerTrack = activeTrack?.noteSource === "stepSequencer";
  const liveRecord = displayState?.header.liveRecord;
  const cheatsheetHints = displayState?.hints ?? [];
  // Erasing holds Shift, and the display is what the performer is watching.
  const showCheatsheet =
    cheatsheetHints.length > 0 &&
    !liveRecord?.erasing &&
    (cheatsheetPinned || displayState?.header.shiftPressed === true);

  const sendControlChange = (cc: number, ccValue: number) => {
    const { controllerSession, engine } = state;
    if (!controllerSession || !engine) {
      return;
    }

    controllerSession.sendControlEvent(
      MidiEvent.fromCC(cc, ccValue, engine.context.currentTime),
    );
  };

  const sendEncoderTick = (cc: number, ticks: number) => {
    sendControlChange(
      cc,
      RELATIVE_PIVOT + clamp(ticks, -MAX_TICKS_PER_EVENT, MAX_TICKS_PER_EVENT),
    );
  };

  const pressButton = (cc: number) => () => {
    sendControlChange(cc, BUTTON_PRESS_VALUE);
  };

  // Step Edit is Shift + Page Up on the hardware; the screen plays the same
  // three events so the surface toggles it the one way it knows.
  const toggleStepEdit = () => {
    sendControlChange(SHIFT_CC, BUTTON_PRESS_VALUE);
    sendControlChange(PAGE_NEXT_CC, BUTTON_PRESS_VALUE);
    sendControlChange(SHIFT_CC, BUTTON_RELEASE_VALUE);
  };

  // Real-time record is Shift + Play on the hardware.
  const toggleLiveRecord = () => {
    sendControlChange(SHIFT_CC, BUTTON_PRESS_VALUE);
    sendControlChange(PLAY_CC, BUTTON_PRESS_VALUE);
    sendControlChange(SHIFT_CC, BUTTON_RELEASE_VALUE);
  };

  // Erase is a hold: Shift + Page Down stay down as long as the pointer does.
  const startErase = () => {
    sendControlChange(SHIFT_CC, BUTTON_PRESS_VALUE);
    sendControlChange(PAGE_PREV_CC, BUTTON_PRESS_VALUE);
  };
  const stopErase = () => {
    if (!liveRecord?.erasing) {
      return;
    }

    sendControlChange(PAGE_PREV_CC, BUTTON_RELEASE_VALUE);
    sendControlChange(SHIFT_CC, BUTTON_RELEASE_VALUE);
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
        {/* The chrome, in a row above the frame: the way back, the cheatsheet
            and fullscreen are not part of playing. */}
        <div
          role="group"
          aria-label="Console"
          className="mb-3 flex items-center justify-between px-1"
        >
          <div className="flex items-center gap-2">{backSlot}</div>
          <div className="flex items-center gap-2">
            <IconButton
              variant="outlined"
              color="neutral"
              aria-label="Settings"
              icon={<Settings className="h-4 w-4" />}
              onClick={() => {
                setSettingsOpen(true);
              }}
              className="rounded-full border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
            />
            <ConsoleSettings
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              settings={recordingSettings}
              onChange={setRecordingSettings}
            />
            <IconButton
              variant="outlined"
              color="neutral"
              aria-label="Cheatsheet"
              aria-pressed={cheatsheetPinned}
              icon={<span className="font-mono text-base leading-none">?</span>}
              onClick={() => {
                setCheatsheetPinned((pinned) => !pinned);
              }}
              className="rounded-full border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
            />
            {/* Only where there is browser chrome to escape, and only
                  where the host asked for it. */}
            {fullscreen.available ? (
              <IconButton
                variant="outlined"
                color="neutral"
                aria-label={
                  fullscreen.isFullscreen ? "Exit Fullscreen" : "Fullscreen"
                }
                icon={
                  fullscreen.isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )
                }
                onClick={() => {
                  void fullscreen.toggle();
                }}
                className="rounded-full border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
              />
            ) : null}
          </div>
        </div>
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
              </div>

              <div
                role="group"
                aria-label="Instrument"
                className="flex flex-wrap items-center gap-3"
              >
                <Button
                  variant="outlined"
                  color="neutral"
                  aria-pressed={isSequencerEdit}
                  disabled={state.status !== "ready" || !isSequencerTrack}
                  onClick={toggleStepEdit}
                  className={cn(
                    "rounded-full px-5 font-mono uppercase tracking-[0.14em]",
                    isSequencerEdit
                      ? "border-lime-300/80 bg-lime-300 text-zinc-950"
                      : "border-zinc-600 text-zinc-200 hover:border-zinc-400",
                  )}
                >
                  Step Edit
                </Button>
                <Button
                  variant="outlined"
                  color="neutral"
                  aria-pressed={liveRecord !== undefined}
                  disabled={state.status !== "ready" || !isSequencerTrack}
                  onClick={toggleLiveRecord}
                  className={cn(
                    "rounded-full px-5 font-mono uppercase tracking-[0.14em]",
                    liveRecord
                      ? "border-red-400/80 bg-red-500 text-zinc-50"
                      : "border-zinc-600 text-zinc-200 hover:border-zinc-400",
                  )}
                >
                  <Circle className="h-3.5 w-3.5 fill-current" />
                  Record
                </Button>
                {liveRecord ? (
                  <Button
                    variant="outlined"
                    color="neutral"
                    aria-pressed={liveRecord.erasing}
                    onPointerDown={startErase}
                    onPointerUp={stopErase}
                    onPointerLeave={stopErase}
                    onPointerCancel={stopErase}
                    className={cn(
                      "rounded-full px-5 font-mono uppercase tracking-[0.14em]",
                      liveRecord.erasing
                        ? "border-amber-300/80 bg-amber-300 text-zinc-950"
                        : "border-zinc-600 text-zinc-200 hover:border-zinc-400",
                    )}
                  >
                    <Eraser className="h-4 w-4" />
                    Erase
                  </Button>
                ) : null}
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
              <aside className="flex flex-col">
                <ConsoleStat
                  label="Track"
                  value={trackName}
                  onPrevious={pressButton(TRACK_PREV_CC)}
                  onNext={pressButton(TRACK_NEXT_CC)}
                />
                {/* Directly under Track: the two navigable stats belong
                    together, so both sets of prev/next fall under the thumb. */}
                <ConsoleStat
                  label="Page Bank"
                  value={pageBankLabel}
                  valueClassName="text-sm"
                  onPrevious={pressButton(PAGE_PREV_CC)}
                  onNext={pressButton(PAGE_NEXT_CC)}
                />
                <ConsoleStat label="Track Volume" value={trackVolume} />
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
                {/* The maker's badge, where hardware carries one. */}
                <div className="mt-auto px-4 pb-1 pt-6">
                  <Logo
                    wordmark
                    className="text-2xl leading-none text-zinc-500"
                  />
                </div>
              </aside>

              <div className="instrument-performance-display">
                <div className="relative z-10">
                  {showCheatsheet ? (
                    <CheatSheet
                      title={isSequencerEdit ? "Step Edit" : "Performance"}
                      hints={cheatsheetHints}
                    />
                  ) : null}

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
                        rotated={fit.rotated}
                        sections={[{ label: "Global Controls", startIndex: 0 }]}
                        slots={displayState.globalBand.slots}
                        onEncoderTick={sendEncoderTick}
                      />
                      <PerformanceBand
                        bandKey="upper"
                        rotated={fit.rotated}
                        sections={displayState.upperBand.sections}
                        slots={displayState.upperBand.slots}
                        onEncoderTick={sendEncoderTick}
                      />
                      <PerformanceBand
                        bandKey="lower"
                        rotated={fit.rotated}
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
