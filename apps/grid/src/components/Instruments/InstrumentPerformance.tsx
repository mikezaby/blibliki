import { Engine, TransportState } from "@blibliki/engine";
import {
  createInstrumentControllerSession,
  createInstrumentEnginePatch,
  createSavedInstrumentDocument,
  type InstrumentControllerSession,
  type InstrumentDisplayState,
  type InstrumentDocument,
} from "@blibliki/instrument";
import { Instrument, type IInstrument } from "@blibliki/models";
import { Button, Surface, Text } from "@blibliki/ui";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Maximize2, Minimize2, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type InstrumentPerformanceProps = {
  instrument: IInstrument;
  onInstrumentChange?: (instrument: IInstrument) => void;
};

type PerformanceState = {
  displayState?: InstrumentDisplayState;
  engine?: Engine;
  controllerSession?: InstrumentControllerSession;
  error?: string;
  status: "loading" | "ready" | "error";
};

type SessionSource = {
  instrument: IInstrument;
  initialDisplayNotice?: InstrumentDisplayState["notice"];
};

type BandCell =
  | InstrumentDisplayState["globalBand"]["slots"][number]
  | InstrumentDisplayState["upperBand"]["slots"][number];

type BandKey = "global" | "upper" | "lower";

type CellVisualValue = {
  kind: "number" | "enum" | "boolean" | "text";
  visualNormalized: number | null;
  showEncoder: boolean;
  empty: boolean;
};

const EMPTY_SLOT_TEXT = "--";
const ENCODER_CENTER = 32;
const ENCODER_RADIUS = 24;
const ENCODER_START_ANGLE = 135;
const ENCODER_SWEEP_ANGLE = 270;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function createEncoderArcPath(normalized: number | null) {
  if (normalized === null || normalized <= 0) {
    return "";
  }

  const safeNormalized = clamp(normalized, 0, 1);
  const start = createEncoderPoint(ENCODER_RADIUS, ENCODER_START_ANGLE);
  const endAngle = ENCODER_START_ANGLE + safeNormalized * ENCODER_SWEEP_ANGLE;
  const end = createEncoderPoint(ENCODER_RADIUS, endAngle);
  const largeArc = safeNormalized > 2 / 3 ? 1 : 0;

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
      const normalized = clamp((slot.rawValue - min) / (max - min), 0, 1);

      return {
        kind: "number",
        visualNormalized:
          exp !== undefined && exp !== 1
            ? Math.pow(normalized, 1 / exp)
            : normalized,
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

function EncoderGlyph({
  normalized,
  inactive,
  accent,
}: {
  normalized: number | null;
  inactive: boolean;
  accent: boolean;
}) {
  const activeArcPath = createEncoderArcPath(normalized);

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
  title,
  slots,
}: {
  bandKey: BandKey;
  title: string;
  slots: readonly BandCell[];
}) {
  return (
    <section className="rounded-3xl bg-zinc-950/80 p-4 shadow-inner">
      <div className="flex items-center justify-between gap-3">
        <Text
          asChild
          size="xs"
          className="font-mono uppercase tracking-[0.3em] text-zinc-500"
        >
          <h2>{title}</h2>
        </Text>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
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

            return (
              <div
                key={`${title}-${index}-${renderCellLabel(slot)}`}
                data-slot-key={slotKey}
                data-slot-layout={visual.showEncoder ? "encoder" : "text"}
                className={cn(
                  "rounded-2xl px-3 py-4 transition-colors",
                  inactive
                    ? "bg-zinc-950/30 text-zinc-600"
                    : "bg-zinc-900/35 text-zinc-50",
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

export default function InstrumentPerformance({
  instrument,
  onInstrumentChange,
}: InstrumentPerformanceProps) {
  const [sessionSource, setSessionSource] = useState<SessionSource>({
    instrument,
  });
  const [state, setState] = useState<PerformanceState>({
    status: "loading",
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const documentRef = useRef(instrument.document as InstrumentDocument);

  useEffect(() => {
    let cancelled = false;
    let engineInstance: Engine | undefined;
    let controllerSessionInstance: InstrumentControllerSession | undefined;

    const setup = async () => {
      try {
        const document = sessionSource.instrument
          .document as InstrumentDocument;
        documentRef.current = document;
        const runtimePatch = createInstrumentEnginePatch(document);
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

              if (action === "saveDraft") {
                const nextInstrument = new Instrument({
                  ...sessionSource.instrument,
                  document: savedDocument,
                });
                await nextInstrument.save();
                documentRef.current = savedDocument;
                onInstrumentChange?.(nextInstrument.serialize());

                return {
                  title: "SAVE COMPLETE",
                  message: "Firestore updated",
                  tone: "success",
                };
              }

              const remoteInstrument = await Instrument.find(
                sessionSource.instrument.id,
              );
              const remoteDocument =
                remoteInstrument.document as InstrumentDocument;
              documentRef.current = remoteDocument;
              onInstrumentChange?.(remoteInstrument.serialize());
              setSessionSource({
                instrument: remoteInstrument.serialize(),
                initialDisplayNotice: {
                  title: "REMOTE RELOADED",
                  message: "Local draft discarded",
                  tone: "success",
                },
              });

              return undefined;
            },
          },
        );

        engineInstance = engine;
        controllerSessionInstance = controllerSession;

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
  }, [sessionSource, onInstrumentChange]);

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
  const pageBankLabel = displayState
    ? `${displayState.upperBand.title} / ${displayState.lowerBand.title}`
    : "--";
  const trackName = displayState?.header.trackName ?? "Waiting for runtime";
  const instrumentName = instrument.name;
  const isTransportRunning =
    displayState?.header.transportState === TransportState.playing;
  const isSequencerEdit = displayState?.header.mode === "seqEdit";
  const canToggleFullscreen =
    typeof document !== "undefined" &&
    typeof document.exitFullscreen === "function" &&
    typeof HTMLElement !== "undefined" &&
    typeof document.documentElement.requestFullscreen === "function";

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
    <div className="flex min-h-screen bg-zinc-950">
      <Surface
        tone="canvas"
        className="instrument-performance-stage w-full h-screen flex items-center px-4 py-5 sm:px-6 sm:py-8"
      >
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="rounded-3xl bg-zinc-900/90 p-3 shadow-2xl sm:p-5">
            <div className="instrument-performance-faceplate rounded-3xl p-4 sm:p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <Text
                    asChild
                    weight="semibold"
                    className="instrument-performance-title block font-mono text-xl uppercase leading-tight tracking-[0.22em] text-zinc-300 sm:text-2xl"
                  >
                    <h1>{instrumentName}</h1>
                  </Text>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                    <StatusLamp active={isTransportRunning} label="Transport" />
                    <StatusLamp active={isSequencerEdit} label="Step Edit" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    variant="text"
                    color="neutral"
                    className="rounded-full border border-zinc-700 bg-zinc-950 px-4 font-mono uppercase tracking-[0.14em] text-zinc-200 hover:bg-zinc-900"
                  >
                    <Link
                      to="/instrument/$instrumentId"
                      params={{ instrumentId: instrument.id }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Editor
                    </Link>
                  </Button>
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

              <div className="mt-6 grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
                <aside>
                  <ConsoleStat label="Track" value={trackName} />
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
                          title="Global Controls"
                          slots={displayState.globalBand.slots}
                        />
                        <PerformanceBand
                          bandKey="upper"
                          title={displayState.upperBand.title}
                          slots={displayState.upperBand.slots}
                        />
                        <PerformanceBand
                          bandKey="lower"
                          title={displayState.lowerBand.title}
                          slots={displayState.lowerBand.slots}
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
    </div>
  );
}
