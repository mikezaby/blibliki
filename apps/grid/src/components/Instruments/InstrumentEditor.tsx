import { Instrument, type IInstrument } from "@blibliki/models";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  OptionSelect,
  Stack,
  Switch,
  Surface,
  Text,
} from "@blibliki/ui";
import { Link } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "@/hooks";
import type {
  EffectProfileId,
  InstrumentDocument,
  InstrumentSequencerStep,
  InstrumentTrackDocument,
  SourceProfileId,
} from "@/instruments/document";
import {
  cloneInstrumentDocument,
  updateSequencerStep,
  updateTrackDocument,
  updateTrackFxChain,
} from "@/instruments/editorState";
import { addNotification } from "@/notificationsSlice";

const SOURCE_PROFILE_OPTIONS: SourceProfileId[] = [
  "unassigned",
  "osc",
  "wavetable",
  "noise",
  "threeOsc",
];
const NOTE_SOURCE_OPTIONS: InstrumentTrackDocument["noteSource"][] = [
  "externalMidi",
  "stepSequencer",
];
const EFFECT_OPTIONS: EffectProfileId[] = [
  "distortion",
  "chorus",
  "delay",
  "reverb",
];
const MIDI_CHANNEL_OPTIONS = Array.from(
  { length: 16 },
  (_, index) => index + 1,
);
const LOOP_LENGTH_OPTIONS = [1, 2, 3, 4] as const;
const SEQUENCER_PAGE_OPTIONS = [1, 2, 3, 4] as const;
const STEP_OPTIONS = Array.from({ length: 16 }, (_, index) => index + 1);
const DURATION_OPTIONS = [
  "1/64",
  "1/48",
  "1/32",
  "1/24",
  "1/16",
  "1/12",
  "1/8",
  "1/6",
  "3/16",
  "1/4",
  "5/16",
  "1/3",
  "3/8",
  "1/2",
  "3/4",
  "1",
  "1.5",
  "2",
  "3",
  "4",
  "6",
  "8",
  "16",
  "32",
] as const;
const RESOLUTION_OPTIONS = ["1/16", "1/8", "1/4", "1/2", "1"] as const;
const PLAYBACK_MODE_OPTIONS = ["loop", "pingPong", "random"] as const;
const DEFAULT_STEP_VELOCITY = 100;

function normalizeStepNoteName(value: string) {
  return value.trim().toUpperCase();
}

function normalizeStepNotesInput(value: string) {
  return value.toUpperCase();
}

function formatStepNotes(notes: InstrumentSequencerStep["notes"]) {
  return notes.map(({ note }) => normalizeStepNoteName(note)).join(", ");
}

function clampStepVelocity(value: number) {
  return Math.max(1, Math.min(127, Math.round(value)));
}

function getStepVelocity(notes: InstrumentSequencerStep["notes"]) {
  const firstVelocity = notes[0]?.velocity;

  return typeof firstVelocity === "number"
    ? clampStepVelocity(firstVelocity)
    : DEFAULT_STEP_VELOCITY;
}

function parseStepNotes(
  input: string,
  velocity: number,
): InstrumentSequencerStep["notes"] {
  const nextVelocity = clampStepVelocity(velocity);

  return input
    .split(",")
    .map((entry) => normalizeStepNoteName(entry))
    .filter((entry) => entry.length > 0)
    .map((entry) => ({
      note: entry,
      velocity: nextVelocity,
    }))
    .filter((entry) => entry.note.length > 0);
}

function formatSelectedStepNotes(
  document: InstrumentDocument,
  trackIndex: number,
  pageIndex: number,
  stepIndex: number,
) {
  const track = document.tracks[trackIndex] ?? document.tracks[0];
  const page = track?.sequencer.pages[pageIndex] ?? track?.sequencer.pages[0];
  const step = page?.steps[stepIndex] ?? page?.steps[0];

  return formatStepNotes(step?.notes ?? []);
}

type InstrumentEditorProps = {
  instrument: IInstrument;
};

export default function InstrumentEditor({
  instrument,
}: InstrumentEditorProps) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState(instrument.name);
  const [document, setDocument] = useState<InstrumentDocument>(() =>
    cloneInstrumentDocument(instrument.document as InstrumentDocument),
  );
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [stepNotesInput, setStepNotesInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextDocument = cloneInstrumentDocument(
      instrument.document as InstrumentDocument,
    );
    setName(instrument.name);
    setDocument(nextDocument);
    setActiveTrackIndex(0);
    setActivePageIndex(0);
    setActiveStepIndex(0);
    setStepNotesInput(formatSelectedStepNotes(nextDocument, 0, 0, 0));
  }, [instrument]);

  const activeTrack = document.tracks[activeTrackIndex] ?? document.tracks[0];
  const activePage =
    activeTrack?.sequencer.pages[activePageIndex] ??
    activeTrack?.sequencer.pages[0];
  const activeStep = activePage?.steps[activeStepIndex] ?? activePage?.steps[0];

  const trackOptions = useMemo(
    () =>
      document.tracks.map((track, index) => ({
        index,
        label: `${
          track.name?.trim().length ? track.name : track.key
        }${track.enabled === false ? " (disabled)" : ""}`,
      })),
    [document.tracks],
  );

  const setTrackChanges = (changes: Partial<InstrumentTrackDocument>) => {
    setDocument((current) =>
      updateTrackDocument(current, activeTrackIndex, changes),
    );
  };

  const setTrackFx = (
    fxIndex: 0 | 1 | 2 | 3,
    effectProfileId: EffectProfileId,
  ) => {
    setDocument((current) =>
      updateTrackFxChain(current, activeTrackIndex, fxIndex, effectProfileId),
    );
  };

  const setStep = (step: InstrumentSequencerStep) => {
    setDocument((current) =>
      updateSequencerStep(
        current,
        activeTrackIndex,
        activePageIndex,
        activeStepIndex,
        step,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const nextInstrument = new Instrument({
        id: instrument.id,
        userId: instrument.userId,
        name,
        document,
      });

      await nextInstrument.save();

      dispatch(
        addNotification({
          type: "success",
          title: "Instrument saved",
          message: `"${name}" has been updated.`,
          duration: 3000,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      dispatch(
        addNotification({
          type: "error",
          title: "Failed to save instrument",
          message: errorMessage,
          duration: 5000,
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!activeTrack || !activePage || !activeStep) {
    return (
      <Surface tone="canvas" className="p-8">
        <Text tone="muted">Instrument document is missing track data.</Text>
      </Surface>
    );
  }

  return (
    <Surface tone="canvas" className="h-screen overflow-auto p-8">
      <Stack className="mx-auto w-full max-w-7xl" gap={6}>
        <Stack
          direction="row"
          align="center"
          justify="between"
          gap={4}
          className="flex-wrap"
        >
          <Stack gap={1}>
            <Text asChild weight="semibold" className="mb-2 text-3xl">
              <h1>{name}</h1>
            </Text>
            <Text tone="muted">
              Edit track setup, controller-facing block choices, and sequencer
              content for the selected track
            </Text>
          </Stack>

          <Stack direction="row" gap={3} className="flex-wrap">
            <Button asChild variant="outlined" color="neutral">
              <Link
                to="/instrument/$instrumentId/debug"
                params={{ instrumentId: instrument.id }}
              >
                Debug in Grid
              </Link>
            </Button>
            <Button
              onClick={() => void handleSave()}
              color="info"
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Instrument"}
            </Button>
          </Stack>
        </Stack>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Tracks</CardTitle>
              <CardDescription>
                Choose the active track to edit its source, FX, and sequencer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Stack gap={2}>
                {trackOptions.map((track) => (
                  <Button
                    key={track.label}
                    variant={
                      track.index === activeTrackIndex
                        ? "contained"
                        : "outlined"
                    }
                    color={
                      track.index === activeTrackIndex ? "info" : "neutral"
                    }
                    onClick={() => {
                      setActiveTrackIndex(track.index);
                      setActivePageIndex(0);
                      setActiveStepIndex(0);
                      setStepNotesInput(
                        formatSelectedStepNotes(document, track.index, 0, 0),
                      );
                    }}
                  >
                    {track.label}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Stack gap={6}>
            <Card>
              <CardHeader>
                <CardTitle>Instrument Metadata</CardTitle>
                <CardDescription>
                  Document-level name and runtime profile identifiers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Stack gap={2} className="md:col-span-2">
                    <Label htmlFor="instrument-name">Instrument Name</Label>
                    <Input
                      id="instrument-name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                      }}
                    />
                  </Stack>
                  <Stack gap={2}>
                    <Label>Template</Label>
                    <Badge tone="info" variant="soft" size="sm">
                      {document.templateId}
                    </Badge>
                    <Badge tone="neutral" variant="soft" size="sm">
                      {document.hardwareProfileId}
                    </Badge>
                  </Stack>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Stack
                  direction="row"
                  align="start"
                  justify="between"
                  gap={4}
                  className="flex-wrap"
                >
                  <Stack gap={1}>
                    <CardTitle>{activeTrack.name ?? activeTrack.key}</CardTitle>
                    <CardDescription>
                      Track identity, source choice, and note source routing
                    </CardDescription>
                  </Stack>

                  <Stack direction="row" align="center" gap={3}>
                    <Text tone="muted" size="xs">
                      Enabled
                    </Text>
                    <Switch
                      id="track-enabled"
                      aria-label="Enable track"
                      checked={activeTrack.enabled !== false}
                      color="info"
                      onCheckedChange={(enabled) => {
                        setTrackChanges({ enabled });
                      }}
                    />
                  </Stack>
                </Stack>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Stack gap={2}>
                    <Label htmlFor="track-name">Track Name</Label>
                    <Input
                      id="track-name"
                      value={activeTrack.name ?? ""}
                      placeholder={activeTrack.key}
                      onChange={(event) => {
                        setTrackChanges({ name: event.target.value });
                      }}
                    />
                  </Stack>

                  <Stack gap={2}>
                    <Label>MIDI Channel</Label>
                    <OptionSelect
                      label="Select MIDI channel"
                      value={activeTrack.midiChannel}
                      options={MIDI_CHANNEL_OPTIONS}
                      onChange={(value: number) => {
                        setTrackChanges({ midiChannel: value });
                      }}
                    />
                  </Stack>

                  <Stack gap={2}>
                    <Label htmlFor="track-voices">Voices</Label>
                    <Input
                      id="track-voices"
                      type="number"
                      min={1}
                      step={1}
                      value={activeTrack.voices ?? 8}
                      onChange={(event) => {
                        const voices = Number.parseInt(event.target.value, 10);
                        if (!Number.isFinite(voices) || voices < 1) {
                          return;
                        }

                        setTrackChanges({ voices });
                      }}
                    />
                  </Stack>

                  <Stack gap={2}>
                    <Label>Note Source</Label>
                    <OptionSelect
                      label="Select note source"
                      value={activeTrack.noteSource}
                      options={NOTE_SOURCE_OPTIONS}
                      onChange={(
                        value: InstrumentTrackDocument["noteSource"],
                      ) => {
                        setTrackChanges({ noteSource: value });
                      }}
                    />
                  </Stack>

                  <Stack gap={2}>
                    <Label>Source Profile</Label>
                    <OptionSelect
                      label="Select source profile"
                      value={activeTrack.sourceProfileId}
                      options={SOURCE_PROFILE_OPTIONS}
                      onChange={(value: SourceProfileId) => {
                        setTrackChanges({ sourceProfileId: value });
                      }}
                    />
                  </Stack>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FX Chain</CardTitle>
                <CardDescription>
                  Choose the four fixed FX blocks shown on the Launch Control FX
                  page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {activeTrack.fxChain.map((effectProfileId, index) => (
                    <Stack gap={2} key={`${activeTrack.key}-fx-${index + 1}`}>
                      <Label>{`FX ${index + 1}`}</Label>
                      <OptionSelect
                        label={`Select FX ${index + 1}`}
                        value={effectProfileId}
                        options={EFFECT_OPTIONS}
                        onChange={(value: EffectProfileId) => {
                          setTrackFx(index as 0 | 1 | 2 | 3, value);
                        }}
                      />
                    </Stack>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sequencer</CardTitle>
                <CardDescription>
                  Edit page, step, and note content for sequencer-backed tracks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Stack gap={5}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Stack gap={2}>
                      <Label>Loop Length</Label>
                      <OptionSelect
                        label="Select loop length"
                        value={activeTrack.sequencer.loopLength}
                        options={LOOP_LENGTH_OPTIONS}
                        onChange={(value: 1 | 2 | 3 | 4) => {
                          setTrackChanges({
                            sequencer: {
                              ...activeTrack.sequencer,
                              loopLength: value,
                            },
                          });
                        }}
                      />
                    </Stack>

                    <Stack gap={2}>
                      <Label>Resolution</Label>
                      <OptionSelect
                        label="Select resolution"
                        value={activeTrack.sequencer.resolution}
                        options={RESOLUTION_OPTIONS}
                        onChange={(value) => {
                          setTrackChanges({
                            sequencer: {
                              ...activeTrack.sequencer,
                              resolution: value,
                            },
                          });
                        }}
                      />
                    </Stack>

                    <Stack gap={2}>
                      <Label>Playback Mode</Label>
                      <OptionSelect
                        label="Select playback mode"
                        value={activeTrack.sequencer.playbackMode}
                        options={PLAYBACK_MODE_OPTIONS}
                        onChange={(value) => {
                          setTrackChanges({
                            sequencer: {
                              ...activeTrack.sequencer,
                              playbackMode: value,
                            },
                          });
                        }}
                      />
                    </Stack>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
                    <Stack gap={3}>
                      <Stack gap={2}>
                        <Label>Page</Label>
                        <OptionSelect
                          label="Select page"
                          value={activePageIndex + 1}
                          options={SEQUENCER_PAGE_OPTIONS}
                          onChange={(value: number) => {
                            setActivePageIndex(value - 1);
                            setActiveStepIndex(0);
                            setStepNotesInput(
                              formatSelectedStepNotes(
                                document,
                                activeTrackIndex,
                                value - 1,
                                0,
                              ),
                            );
                          }}
                        />
                      </Stack>

                      <Stack gap={2}>
                        <Label>Step</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {STEP_OPTIONS.map((stepNo) => (
                            <Button
                              key={`${activeTrack.key}-step-${stepNo}`}
                              variant={
                                stepNo - 1 === activeStepIndex
                                  ? "contained"
                                  : "outlined"
                              }
                              color={
                                stepNo - 1 === activeStepIndex
                                  ? "info"
                                  : "neutral"
                              }
                              size="sm"
                              onClick={() => {
                                setActiveStepIndex(stepNo - 1);
                                setStepNotesInput(
                                  formatSelectedStepNotes(
                                    document,
                                    activeTrackIndex,
                                    activePageIndex,
                                    stepNo - 1,
                                  ),
                                );
                              }}
                            >
                              {stepNo}
                            </Button>
                          ))}
                        </div>
                      </Stack>
                    </Stack>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Stack gap={2}>
                        <Label>Active</Label>
                        <OptionSelect
                          label="Select active state"
                          value={activeStep.active ? "on" : "off"}
                          options={[
                            { name: "On", value: "on" },
                            { name: "Off", value: "off" },
                          ]}
                          onChange={(value: "on" | "off") => {
                            setStep({
                              ...activeStep,
                              active: value === "on",
                            });
                          }}
                        />
                      </Stack>

                      <Stack gap={2}>
                        <Label>Duration</Label>
                        <OptionSelect
                          label="Select duration"
                          value={activeStep.duration}
                          options={DURATION_OPTIONS}
                          onChange={(
                            value: InstrumentSequencerStep["duration"],
                          ) => {
                            setStep({
                              ...activeStep,
                              duration: value,
                            });
                          }}
                        />
                      </Stack>

                      <Stack gap={2} className="md:col-span-2">
                        <Label htmlFor="step-notes">Notes</Label>
                        <Input
                          id="step-notes"
                          value={stepNotesInput}
                          placeholder="C3, E3"
                          onChange={(event) => {
                            const value = normalizeStepNotesInput(
                              event.target.value,
                            );
                            setStepNotesInput(value);
                            setStep({
                              ...activeStep,
                              notes: parseStepNotes(
                                value,
                                getStepVelocity(activeStep.notes),
                              ),
                            });
                          }}
                        />
                        <Text tone="muted" size="xs">
                          Use comma-separated note names, example: `C3, E3`
                        </Text>
                      </Stack>

                      <Stack gap={2}>
                        <Label htmlFor="step-probability">Probability</Label>
                        <Input
                          id="step-probability"
                          type="number"
                          min="0"
                          max="100"
                          value={activeStep.probability}
                          onChange={(event) => {
                            setStep({
                              ...activeStep,
                              probability: Number(event.target.value),
                            });
                          }}
                        />
                      </Stack>

                      <Stack gap={2}>
                        <Label htmlFor="step-velocity">Velocity</Label>
                        <Input
                          id="step-velocity"
                          type="number"
                          min="1"
                          max="127"
                          value={getStepVelocity(activeStep.notes)}
                          onChange={(event) => {
                            const velocity = clampStepVelocity(
                              Number(event.target.value),
                            );

                            setStep({
                              ...activeStep,
                              notes: activeStep.notes.map((note) => ({
                                ...note,
                                velocity,
                              })),
                            });
                          }}
                        />
                      </Stack>

                      <Stack gap={2}>
                        <Label htmlFor="step-microtime">Microtime</Label>
                        <Input
                          id="step-microtime"
                          type="number"
                          value={activeStep.microtimeOffset}
                          onChange={(event) => {
                            setStep({
                              ...activeStep,
                              microtimeOffset: Number(event.target.value),
                            });
                          }}
                        />
                      </Stack>
                    </div>
                  </div>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </div>
      </Stack>
    </Surface>
  );
}
