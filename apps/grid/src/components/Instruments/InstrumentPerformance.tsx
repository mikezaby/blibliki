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
import { ArrowLeft, Play, Square } from "lucide-react";
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

function renderCellValue(slot: BandCell) {
  if ("kind" in slot && slot.kind === "empty") {
    return "--";
  }

  return slot.valueText;
}

function renderCellLabel(slot: BandCell) {
  if ("kind" in slot && slot.kind === "empty") {
    return "--";
  }

  return slot.shortLabel;
}

function isInactiveCell(slot: BandCell) {
  if ("kind" in slot && slot.kind === "empty") {
    return true;
  }

  return slot.inactive === true;
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 px-4 py-3 shadow-inner">
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

function PerformanceBand({
  title,
  slots,
}: {
  title: string;
  slots: readonly BandCell[];
}) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-inner">
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
          slots.map((slot, index) => (
            <div
              key={`${title}-${index}-${renderCellLabel(slot)}`}
              className={cn(
                "rounded-2xl border px-3 py-4 transition-colors",
                isInactiveCell(slot)
                  ? "border-zinc-900 bg-zinc-950/80 text-zinc-600"
                  : "border-zinc-700 bg-zinc-900 text-zinc-50 shadow-inner",
              )}
            >
              <Text
                asChild
                size="xs"
                className={cn(
                  "font-mono uppercase tracking-[0.2em]",
                  isInactiveCell(slot) ? "text-zinc-700" : "text-zinc-500",
                )}
              >
                <span>{renderCellLabel(slot)}</span>
              </Text>
              <Text
                asChild
                className={cn(
                  "mt-3 block font-mono text-lg font-semibold uppercase tracking-[0.06em]",
                  isInactiveCell(slot) ? "text-zinc-500" : "text-zinc-100",
                )}
              >
                <span>{renderCellValue(slot)}</span>
              </Text>
            </div>
          ))
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

  const displayState = state.displayState;
  const pageBankLabel = displayState
    ? `${displayState.upperBand.title} / ${displayState.lowerBand.title}`
    : "--";
  const trackName = displayState?.header.trackName ?? "Waiting for runtime";
  const instrumentName = instrument.name;
  const isRuntimeReady = state.status === "ready";
  const isTransportRunning =
    displayState?.header.transportState === TransportState.playing;
  const isSequencerEdit = displayState?.header.mode === "seqEdit";

  return (
    <Surface
      tone="canvas"
      className="instrument-performance-stage min-h-screen px-4 py-5 sm:px-6 sm:py-8"
    >
      <div className="mx-auto w-full max-w-screen-2xl">
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/90 p-3 shadow-2xl sm:p-5">
          <div className="instrument-performance-faceplate rounded-3xl border border-zinc-800 p-4 sm:p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <Text
                  asChild
                  size="xs"
                  className="font-mono uppercase tracking-[0.32em] text-zinc-500"
                >
                  <span>Performance Console</span>
                </Text>
                <Text
                  asChild
                  weight="semibold"
                  className="instrument-performance-title mt-2 block font-mono text-xl uppercase leading-tight tracking-[0.22em] text-zinc-300 sm:text-2xl"
                >
                  <h1>{instrumentName}</h1>
                </Text>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  <StatusLamp active={isRuntimeReady} label="Runtime" />
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
                  color="neutral"
                  disabled={state.status !== "ready" || !state.engine}
                  onClick={() => {
                    void state.engine?.start();
                  }}
                  className="rounded-full border border-zinc-600 bg-zinc-50 px-5 font-mono uppercase tracking-[0.14em] text-zinc-950 shadow-[0_6px_20px_rgba(255,255,255,0.08)]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Start Engine
                </Button>
                <Button
                  variant="outlined"
                  color="neutral"
                  disabled={state.status !== "ready" || !state.engine}
                  onClick={() => {
                    state.engine?.stop();
                  }}
                  className="rounded-full border-zinc-600 px-5 font-mono uppercase tracking-[0.14em] text-zinc-200 hover:border-zinc-400 hover:bg-zinc-900"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop Engine
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
              <aside className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-inner">
                <Text
                  asChild
                  size="xs"
                  className="font-mono uppercase tracking-[0.3em] text-zinc-500"
                >
                  <h2>Status Rail</h2>
                </Text>
                <div className="mt-4 grid gap-3">
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
                </div>
              </aside>

              <div className="instrument-performance-display rounded-3xl border border-zinc-700 p-4 shadow-inner sm:p-5">
                <div className="relative z-10">
                  {state.status === "loading" ? (
                    <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/80 px-5 py-10">
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
                        title="Global Controls"
                        slots={displayState.globalBand.slots}
                      />
                      <PerformanceBand
                        title={displayState.upperBand.title}
                        slots={displayState.upperBand.slots}
                      />
                      <PerformanceBand
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
  );
}
