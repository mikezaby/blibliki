import { Engine } from "@blibliki/engine";
import {
  createInstrumentControllerSession,
  createInstrumentEnginePatch,
  createSavedInstrumentDocument,
  type InstrumentControllerSession,
  type InstrumentDisplayState,
  type InstrumentDocument,
} from "@blibliki/instrument";
import { Instrument, type IInstrument } from "@blibliki/models";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Stack,
  Surface,
  Text,
} from "@blibliki/ui";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

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

function PerformanceBand({
  title,
  slots,
}: {
  title: string;
  slots: readonly BandCell[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {slots.map((slot, index) => (
            <div
              key={`${title}-${index}-${renderCellLabel(slot)}`}
              className={`rounded-xl border p-3 ${
                isInactiveCell(slot)
                  ? "border-neutral-200 bg-neutral-50 text-neutral-500"
                  : "border-neutral-300 bg-white"
              }`}
            >
              <Text size="xs" tone="muted">
                {renderCellLabel(slot)}
              </Text>
              <Text asChild weight="semibold" className="mt-2 block text-lg">
                <span>{renderCellValue(slot)}</span>
              </Text>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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

  return (
    <Surface tone="canvas" className="min-h-screen p-6">
      <Stack className="mx-auto w-full max-w-7xl" gap={6}>
        <Stack
          direction="row"
          align="center"
          justify="between"
          gap={4}
          className="flex-wrap"
        >
          <div>
            <Text asChild weight="semibold" className="mb-2 text-3xl">
              <h1>{instrument.name}</h1>
            </Text>
            <Text tone="muted">
              Performance view mirrors the Pi runtime state and listens to the
              same Launch Control navigation and sequencer-edit interactions.
            </Text>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outlined" color="neutral">
              <Link
                to="/instrument/$instrumentId"
                params={{ instrumentId: instrument.id }}
                search={{ mode: undefined }}
              >
                Back to Editor
              </Link>
            </Button>
            <Button
              color="success"
              disabled={state.status !== "ready" || !state.engine}
              onClick={() => {
                void state.engine?.start();
              }}
            >
              Start
            </Button>
            <Button
              variant="outlined"
              color="neutral"
              disabled={state.status !== "ready" || !state.engine}
              onClick={() => {
                state.engine?.stop();
              }}
            >
              Stop
            </Button>
          </div>
        </Stack>

        {state.status === "loading" ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading Performance Runtime</CardTitle>
              <CardDescription>
                Initializing engine, MIDI devices, and controller session.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {state.status === "error" ? (
          <Card>
            <CardHeader>
              <CardTitle>Performance Runtime Failed</CardTitle>
              <CardDescription>{state.error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {displayState ? (
          <>
            <Card>
              <CardHeader>
                <Stack
                  direction="row"
                  align="center"
                  justify="between"
                  gap={4}
                  className="flex-wrap"
                >
                  <div>
                    <CardTitle>{displayState.header.trackName}</CardTitle>
                    <CardDescription>
                      Page {displayState.header.controllerPage}:{" "}
                      {displayState.upperBand.title} /{" "}
                      {displayState.lowerBand.title}
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge tone="info" variant="soft" size="sm">
                      {displayState.header.mode === "seqEdit"
                        ? "SEQ EDIT"
                        : "PERFORMANCE"}
                    </Badge>
                    <Badge tone="neutral" variant="soft" size="sm">
                      {displayState.header.transportState.toUpperCase()}
                    </Badge>
                    <Badge tone="neutral" variant="soft" size="sm">
                      MIDI {displayState.header.midiChannel}
                    </Badge>
                  </div>
                </Stack>
              </CardHeader>
              {displayState.notice ? (
                <CardContent>
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <Text weight="semibold">{displayState.notice.title}</Text>
                    {displayState.notice.message ? (
                      <Text tone="muted">{displayState.notice.message}</Text>
                    ) : null}
                  </div>
                </CardContent>
              ) : null}
            </Card>

            <PerformanceBand
              title="Global"
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
          </>
        ) : null}
      </Stack>
    </Surface>
  );
}
