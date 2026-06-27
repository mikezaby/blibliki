import {
  ModuleType,
  ModuleTypeToPropsMapping,
  cloneWavetablePresetTables,
  getWavetablePresetById,
} from "@blibliki/engine";
import {
  compileTrack,
  createTrackFromDocument,
  type SlotInitialValue,
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
  Fader,
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
import { useMemo, useState } from "react";
import type { TUpdateProp } from "@/components/AudioModule";
import Chorus from "@/components/AudioModule/Chorus";
import Compressor from "@/components/AudioModule/Compressor";
import Delay from "@/components/AudioModule/Delay";
import Distortion from "@/components/AudioModule/Distortion";
import DrumMachine from "@/components/AudioModule/DrumMachine";
import EnvelopeEditor from "@/components/AudioModule/Envelope";
import { Filter as FilterEditor } from "@/components/AudioModule/Filter";
import Noise from "@/components/AudioModule/Noise";
import OscillatorEditor from "@/components/AudioModule/Oscillator";
import Reverb from "@/components/AudioModule/Reverb";
import StepSequencerEditor from "@/components/AudioModule/StepSequencer/StepSequencerEditor";
import {
  toEditorPages,
  toInstrumentPages,
  updateInstrumentPageStep,
} from "@/components/AudioModule/StepSequencer/instrumentAdapter";
import WavetableEditor from "@/components/AudioModule/Wavetable";
import { useAppDispatch } from "@/hooks";
import type {
  EffectProfileId,
  InstrumentDocument,
  InstrumentLatencyHint,
  InstrumentTrackDocument,
  SourceProfileId,
} from "@/instruments/document";
import {
  cloneInstrumentDocument,
  selectTrackAudioSource,
  updateTrackControllerSlotValue,
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
  "drumMachine",
];
const NOTE_SOURCE_OPTIONS: InstrumentTrackDocument["noteSource"][] = [
  "externalMidi",
  "stepSequencer",
];
const ROUTING_MODE_OPTIONS = ["parallel", "serial"] as const;
const EFFECT_OPTIONS: EffectProfileId[] = [
  "distortion",
  "compressor",
  "chorus",
  "delay",
  "reverb",
];
const MIDI_CHANNEL_OPTIONS = Array.from(
  { length: 16 },
  (_, index) => index + 1,
);
const LOOP_LENGTH_OPTIONS = [1, 2, 3, 4] as const;
const LATENCY_HINT_OPTIONS = ["interactive", "playback"] as const;
const TRACK_VOICES_MIN = 1;
const TRACK_VOICES_MAX = 64;
function renderSourceEditor(
  sourceProfileId: SourceProfileId,
  modulePropsById: Map<string, Record<string, unknown>>,
  blockUpdateProp: <T extends ModuleType>(blockKey: string) => TUpdateProp<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suffixedUpdateProp: (suffix: string) => TUpdateProp<any>,
) {
  switch (sourceProfileId) {
    case "unassigned":
      return null;
    case "osc": {
      const props = modulePropsById.get("source.main");
      if (!props) return null;
      return (
        <OscillatorEditor
          id="source.main"
          name="Oscillator"
          moduleType={ModuleType.Oscillator}
          props={props as ModuleTypeToPropsMapping[ModuleType.Oscillator]}
          updateProp={blockUpdateProp("source")}
        />
      );
    }
    case "wavetable": {
      const props = modulePropsById.get("source.main");
      if (!props) return null;
      const wavetableProps = props as ModuleTypeToPropsMapping[ModuleType.Wavetable];
      const propsWithTables = wavetableProps.tables
        ? wavetableProps
        : {
            ...wavetableProps,
            tables: (() => {
              const preset = getWavetablePresetById(wavetableProps.presetId ?? "");
              return preset ? cloneWavetablePresetTables(preset.tables) : [];
            })(),
          };
      return (
        <WavetableEditor
          id="source.main"
          name="Wavetable"
          moduleType={ModuleType.Wavetable}
          props={propsWithTables}
          updateProp={blockUpdateProp("source")}
        />
      );
    }
    case "noise": {
      const props = modulePropsById.get("source.main");
      if (!props) return null;
      return (
        <Noise
          id="source.main"
          name="Noise"
          moduleType={ModuleType.Noise}
          props={props as ModuleTypeToPropsMapping[ModuleType.Noise]}
          updateProp={blockUpdateProp("source")}
        />
      );
    }
    case "threeOsc": {
      const osc1Props = modulePropsById.get("source.osc1");
      const osc2Props = modulePropsById.get("source.osc2");
      const osc3Props = modulePropsById.get("source.osc3");
      return (
        <Stack gap={6}>
          {osc1Props && (
            <OscillatorEditor
              id="source.osc1"
              name="Osc 1"
              moduleType={ModuleType.Oscillator}
              props={
                osc1Props as ModuleTypeToPropsMapping[ModuleType.Oscillator]
              }
              updateProp={suffixedUpdateProp("1")}
            />
          )}
          {osc2Props && (
            <OscillatorEditor
              id="source.osc2"
              name="Osc 2"
              moduleType={ModuleType.Oscillator}
              props={
                osc2Props as ModuleTypeToPropsMapping[ModuleType.Oscillator]
              }
              updateProp={suffixedUpdateProp("2")}
            />
          )}
          {osc3Props && (
            <OscillatorEditor
              id="source.osc3"
              name="Osc 3"
              moduleType={ModuleType.Oscillator}
              props={
                osc3Props as ModuleTypeToPropsMapping[ModuleType.Oscillator]
              }
              updateProp={suffixedUpdateProp("3")}
            />
          )}
        </Stack>
      );
    }
    case "drumMachine": {
      const props = modulePropsById.get("source.main");
      if (!props) return null;
      return (
        <DrumMachine
          id="source.main"
          name="Drum Machine"
          moduleType={ModuleType.DrumMachine}
          props={props as ModuleTypeToPropsMapping[ModuleType.DrumMachine]}
          updateProp={blockUpdateProp("source")}
        />
      );
    }
  }
}

function renderFxEditor(
  effectProfileId: EffectProfileId,
  moduleId: string,
  props: Record<string, unknown>,
  // ponytail: any needed — props come from compiled track, type safety via switch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateProp: TUpdateProp<any>,
) {
  const shared = { id: moduleId, name: effectProfileId };
  switch (effectProfileId) {
    case "chorus":
      return (
        <Chorus
          {...shared}
          moduleType={ModuleType.Chorus}
          props={props as ModuleTypeToPropsMapping[ModuleType.Chorus]}
          updateProp={updateProp}
        />
      );
    case "delay":
      return (
        <Delay
          {...shared}
          moduleType={ModuleType.Delay}
          props={props as ModuleTypeToPropsMapping[ModuleType.Delay]}
          updateProp={updateProp}
        />
      );
    case "reverb":
      return (
        <Reverb
          {...shared}
          moduleType={ModuleType.Reverb}
          props={props as ModuleTypeToPropsMapping[ModuleType.Reverb]}
          updateProp={updateProp}
        />
      );
    case "distortion":
      return (
        <Distortion
          {...shared}
          moduleType={ModuleType.Distortion}
          props={props as ModuleTypeToPropsMapping[ModuleType.Distortion]}
          updateProp={updateProp}
        />
      );
    case "compressor":
      return (
        <Compressor
          {...shared}
          moduleType={ModuleType.Compressor}
          props={props as ModuleTypeToPropsMapping[ModuleType.Compressor]}
          updateProp={updateProp}
        />
      );
  }
}

type InstrumentEditorProps = {
  instrument: IInstrument;
};

export default function InstrumentEditor({
  instrument,
}: InstrumentEditorProps) {
  return <InstrumentEditorForm key={instrument.id} instrument={instrument} />;
}

function InstrumentEditorForm({ instrument }: InstrumentEditorProps) {
  const dispatch = useAppDispatch();
  const initialDocument = useMemo(
    () => cloneInstrumentDocument(instrument.document as InstrumentDocument),
    [instrument],
  );
  const [name, setName] = useState(instrument.name);
  const [document, setDocument] = useState<InstrumentDocument>(initialDocument);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const activeTrack = document.tracks[activeTrackIndex] ?? document.tracks[0];
  const activeAudioSource = activeTrack?.audioSource ?? { type: "internal" };
  const editorPages = useMemo(
    () => toEditorPages(activeTrack?.sequencer.pages ?? []),
    [activeTrack?.sequencer.pages],
  );
  const compiledActiveTrack = useMemo(() => {
    if (!activeTrack) {
      return;
    }

    return compileTrack(createTrackFromDocument(activeTrack));
  }, [activeTrack]);
  const controllerModulePropsById = useMemo(
    () =>
      new Map(
        (compiledActiveTrack?.engine.modules ?? []).map((module) => [
          module.id,
          module.props as Record<string, unknown>,
        ]),
      ),
    [compiledActiveTrack],
  );

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
  const audioSourceOptions = useMemo(
    () => [
      { name: "Internal", value: "internal" },
      ...document.tracks.map((track) => ({
        name: `${
          track.name?.trim().length ? track.name : track.key
        }${track.enabled === false ? " (disabled)" : ""}`,
        value: track.key,
      })),
    ],
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

  const makeBlockUpdateProp =
    <T extends ModuleType>(blockKey: string): TUpdateProp<T> =>
    <K extends keyof ModuleTypeToPropsMapping[T]>(propKey: K) =>
    (value: ModuleTypeToPropsMapping[T][K]) => {
      setDocument((current) =>
        updateTrackControllerSlotValue(
          current,
          activeTrackIndex,
          `${blockKey}.${String(propKey)}`,
          value as SlotInitialValue,
        ),
      );
    };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeThreeOscUpdateProp = (suffix: string): TUpdateProp<any> =>
    ((propKey: string) => (value: SlotInitialValue) => {
      setDocument((current) =>
        updateTrackControllerSlotValue(
          current,
          activeTrackIndex,
          `source.${propKey}${suffix}`,
          value,
        ),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as TUpdateProp<any>;

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

  if (!activeTrack) {
    return (
      <Surface tone="canvas" className="p-8">
        <Text tone="muted">Instrument document is missing track data.</Text>
      </Surface>
    );
  }

  return (
    <Surface tone="canvas" className="p-8">
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
                to="/instrument/$instrumentId/performance"
                params={{ instrumentId: instrument.id }}
              >
                Performance
              </Link>
            </Button>
            <Button asChild variant="outlined" color="neutral">
              <Link
                to="/instrument/$instrumentId/debug"
                params={{ instrumentId: instrument.id }}
                search={{ mode: undefined }}
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
                  <Stack gap={2}>
                    <Label>Latency</Label>
                    <OptionSelect
                      label="Select latency mode"
                      value={document.latencyHint ?? "interactive"}
                      options={LATENCY_HINT_OPTIONS}
                      onChange={(value: InstrumentLatencyHint) => {
                        setDocument((current) => ({
                          ...current,
                          latencyHint: value,
                        }));
                      }}
                    />
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
                    <Label>Audio Source</Label>
                    <OptionSelect
                      label="Select audio source"
                      value={
                        activeAudioSource.type === "track"
                          ? activeAudioSource.trackKey
                          : "internal"
                      }
                      options={audioSourceOptions}
                      onChange={(value: string) => {
                        setDocument((current) =>
                          selectTrackAudioSource(
                            current,
                            activeTrackIndex,
                            value === "internal" ? undefined : value,
                          ),
                        );
                      }}
                    />
                  </Stack>

                  {activeAudioSource.type === "track" ? (
                    <Stack gap={2}>
                      <Label>Routing Mode</Label>
                      <OptionSelect
                        label="Select routing mode"
                        value={activeAudioSource.mode}
                        options={ROUTING_MODE_OPTIONS}
                        onChange={(mode: "parallel" | "serial") => {
                          setTrackChanges({
                            audioSource: {
                              ...activeAudioSource,
                              mode,
                            },
                          });
                        }}
                      />
                    </Stack>
                  ) : (
                    <>
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
                        <Fader
                          name="Voices"
                          value={activeTrack.voices ?? 8}
                          min={TRACK_VOICES_MIN}
                          max={TRACK_VOICES_MAX}
                          step={1}
                          orientation="horizontal"
                          onChange={(_, voices) => {
                            setTrackChanges({ voices });
                          }}
                        />
                      </Stack>
                    </>
                  )}

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

                  {activeAudioSource.type === "internal" ? (
                    <Stack gap={2}>
                      <Label>Source Profile</Label>
                      <OptionSelect
                        label="Select source profile"
                        value={activeTrack.sourceProfileId}
                        options={SOURCE_PROFILE_OPTIONS}
                        onChange={(value: SourceProfileId) => {
                          setTrackChanges({
                            sourceProfileId: value,
                          });
                        }}
                      />
                    </Stack>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {activeAudioSource.type === "internal" &&
              activeTrack.sourceProfileId !== "unassigned" &&
              (() => {
                const sourceEditor = renderSourceEditor(
                  activeTrack.sourceProfileId,
                  controllerModulePropsById,
                  makeBlockUpdateProp,
                  makeThreeOscUpdateProp,
                );
                return sourceEditor ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Source</CardTitle>
                    </CardHeader>
                    <CardContent>{sourceEditor}</CardContent>
                  </Card>
                ) : null;
              })()}

            {(() => {
              const ampEnvelopeProps = controllerModulePropsById.get(
                "amp.envelope",
              ) as ModuleTypeToPropsMapping[ModuleType.Envelope] | undefined;
              return ampEnvelopeProps ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Amp Envelope</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EnvelopeEditor
                      id="amp.envelope"
                      name="AmpEnvelope"
                      moduleType={ModuleType.Envelope}
                      props={ampEnvelopeProps}
                      updateProp={makeBlockUpdateProp<ModuleType.Envelope>(
                        "amp",
                      )}
                    />
                  </CardContent>
                </Card>
              ) : null;
            })()}

            {(() => {
              const filterProps = controllerModulePropsById.get(
                "filter.main",
              ) as ModuleTypeToPropsMapping[ModuleType.Filter] | undefined;
              const filterEnvelopeProps = controllerModulePropsById.get(
                "filter.envelope",
              ) as ModuleTypeToPropsMapping[ModuleType.Envelope] | undefined;
              if (!filterProps && !filterEnvelopeProps) return null;
              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Filter</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Stack gap={6}>
                      {filterProps && (
                        <FilterEditor
                          id="filter.main"
                          name="Filter"
                          moduleType={ModuleType.Filter}
                          props={filterProps}
                          updateProp={makeBlockUpdateProp<ModuleType.Filter>(
                            "filter",
                          )}
                        />
                      )}
                      {filterEnvelopeProps && (
                        <EnvelopeEditor
                          id="filter.envelope"
                          name="FilterEnvelope"
                          moduleType={ModuleType.Envelope}
                          props={filterEnvelopeProps}
                          updateProp={makeBlockUpdateProp<ModuleType.Envelope>(
                            "filter",
                          )}
                        />
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })()}

            <Card>
              <CardHeader>
                <CardTitle>FX Chain</CardTitle>
                <CardDescription>
                  Choose the four fixed FX blocks shown on the Launch Control FX
                  page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Stack gap={4}>
                  {activeTrack.fxChain.map((effectProfileId, index) => {
                    const fxKey = `fx${index + 1}`;
                    const moduleId = `${fxKey}.main`;
                    const fxProps = controllerModulePropsById.get(moduleId);
                    return (
                      <Surface
                        key={`${activeTrack.key}-fx-${index + 1}`}
                        tone="subtle"
                        className="rounded-xl p-4"
                      >
                        <Stack gap={3}>
                          <Stack gap={2} className="max-w-48">
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
                          {fxProps &&
                            renderFxEditor(
                              effectProfileId,
                              moduleId,
                              fxProps,
                              makeBlockUpdateProp(fxKey),
                            )}
                        </Stack>
                      </Surface>
                    );
                  })}
                </Stack>
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
                  <Stack gap={2} className="max-w-48">
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

                  <StepSequencerEditor
                    key={activeTrack.key}
                    pages={editorPages}
                    activePageNo={activePageIndex}
                    stepsPerPage={16}
                    resolution={activeTrack.sequencer.resolution}
                    playbackMode={activeTrack.sequencer.playbackMode}
                    onPageChange={setActivePageIndex}
                    onStepChange={(pageIndex, stepIndex, step) => {
                      setTrackChanges({
                        sequencer: {
                          ...activeTrack.sequencer,
                          pages: updateInstrumentPageStep(
                            activeTrack.sequencer.pages,
                            pageIndex,
                            stepIndex,
                            step,
                          ),
                        },
                      });
                    }}
                    onPagesChange={(pages) => {
                      setTrackChanges({
                        sequencer: {
                          ...activeTrack.sequencer,
                          pages: toInstrumentPages(pages),
                        },
                      });
                    }}
                    onResolutionChange={(resolution) => {
                      setTrackChanges({
                        sequencer: {
                          ...activeTrack.sequencer,
                          resolution,
                        },
                      });
                    }}
                    onPlaybackModeChange={(playbackMode) => {
                      setTrackChanges({
                        sequencer: {
                          ...activeTrack.sequencer,
                          playbackMode,
                        },
                      });
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </div>
      </Stack>
    </Surface>
  );
}
