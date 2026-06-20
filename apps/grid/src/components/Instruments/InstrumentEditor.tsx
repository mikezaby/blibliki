import { ModuleType, WAVETABLE_PRESETS } from "@blibliki/engine";
import {
  compileTrack,
  createTrackFromDocument,
  type CompiledLaunchControlXL3Page,
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
import StepSequencerEditor from "@/components/AudioModule/StepSequencer/StepSequencerEditor";
import {
  toEditorPages,
  updateInstrumentPageStep,
} from "@/components/AudioModule/StepSequencer/instrumentAdapter";
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
const WAVETABLE_PRESET_NAME_BY_ID = new Map(
  WAVETABLE_PRESETS.map((preset) => [preset.id, preset.name]),
);
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
const LATENCY_HINT_OPTIONS = ["interactive", "playback"] as const;
const TRACK_VOICES_MIN = 1;
const TRACK_VOICES_MAX = 64;
const CONTROLLER_PAGE_LABELS: Record<
  CompiledLaunchControlXL3Page["pageKey"],
  string
> = {
  sourceAmp: "Source + Amp",
  filterMod: "Filter + Modulation",
  fx: "FX Chain",
};

type ControllerSlot = Extract<
  CompiledLaunchControlXL3Page["regions"][number]["slots"][number],
  { kind: "slot" }
>;

function getControllerSlotId(
  trackKey: string,
  pageKey: CompiledLaunchControlXL3Page["pageKey"],
  slot: ControllerSlot,
) {
  return `${trackKey}-${pageKey}-${slot.blockKey}-${slot.slotKey}`;
}

function getControllerSlotDocumentKey(slot: ControllerSlot) {
  return `${slot.blockKey}.${slot.slotKey}`;
}

function getControllerEnumOptions(
  slot: ControllerSlot,
  options: readonly (string | number)[],
) {
  return options.map((option) => ({
    name:
      slot.binding.moduleType === ModuleType.Wavetable &&
      slot.binding.propKey === "presetId" &&
      typeof option === "string"
        ? (WAVETABLE_PRESET_NAME_BY_ID.get(option) ?? option)
        : String(option),
    value: option,
  }));
}

function isSlotInitialValue(value: unknown): value is SlotInitialValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function getControllerSlotValue(
  slot: ControllerSlot,
  modulePropsById: Map<string, Record<string, unknown>>,
) {
  if (slot.initialValue !== undefined) {
    return slot.initialValue;
  }

  const propValue = modulePropsById.get(slot.binding.moduleId)?.[
    slot.binding.propKey
  ];

  return isSlotInitialValue(propValue) ? propValue : undefined;
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
  const controllerPages =
    compiledActiveTrack?.launchControlXL3.resolvedPages ?? [];
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

  const setControllerSlotValue = (
    slot: ControllerSlot,
    value: SlotInitialValue,
  ) => {
    setDocument((current) =>
      updateTrackControllerSlotValue(
        current,
        activeTrackIndex,
        getControllerSlotDocumentKey(slot),
        value,
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
                        setTrackChanges({
                          sourceProfileId: value,
                        });
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
                <CardTitle>Controller Slots</CardTitle>
                <CardDescription>
                  Set the initial values loaded into Pi for the same track
                  controls exposed on the controller
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Stack gap={4}>
                  {controllerPages.map((page) => (
                    <Surface
                      key={`${activeTrack.key}-${page.pageKey}`}
                      tone="subtle"
                      className="rounded-xl p-4"
                    >
                      <Stack gap={4}>
                        <Stack gap={1}>
                          <Text weight="semibold">
                            {CONTROLLER_PAGE_LABELS[page.pageKey]}
                          </Text>
                          <Text tone="muted" size="xs">
                            Controller page {page.controllerPage}
                          </Text>
                        </Stack>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                          {page.regions.map((region) => {
                            const slots = region.slots.filter(
                              (slot): slot is ControllerSlot =>
                                slot.kind === "slot",
                            );

                            if (slots.length === 0) {
                              return null;
                            }

                            return (
                              <Surface
                                key={`${page.pageKey}-${region.position}`}
                                tone="canvas"
                                className="rounded-lg p-4"
                              >
                                <Stack gap={3}>
                                  <Text weight="medium">
                                    {region.position === "top"
                                      ? "Upper Row"
                                      : "Lower Row"}
                                  </Text>

                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {slots.map((slot) => {
                                      const inputId = getControllerSlotId(
                                        activeTrack.key,
                                        page.pageKey,
                                        slot,
                                      );
                                      const slotValue = getControllerSlotValue(
                                        slot,
                                        controllerModulePropsById,
                                      );

                                      if (slot.valueSpec.kind === "number") {
                                        return (
                                          <Stack
                                            gap={2}
                                            key={`${slot.blockKey}-${slot.slotKey}`}
                                          >
                                            <Fader
                                              id={inputId}
                                              name={slot.label}
                                              min={slot.valueSpec.min}
                                              max={slot.valueSpec.max}
                                              step={slot.valueSpec.step}
                                              exp={slot.valueSpec.exp}
                                              value={
                                                typeof slotValue === "number"
                                                  ? slotValue
                                                  : undefined
                                              }
                                              orientation="horizontal"
                                              onChange={(_, nextValue) => {
                                                setControllerSlotValue(
                                                  slot,
                                                  nextValue,
                                                );
                                              }}
                                            />
                                          </Stack>
                                        );
                                      }

                                      if (slot.valueSpec.kind === "boolean") {
                                        return (
                                          <Stack
                                            gap={2}
                                            key={`${slot.blockKey}-${slot.slotKey}`}
                                          >
                                            <Label htmlFor={inputId}>
                                              {slot.label}
                                            </Label>
                                            <Switch
                                              id={inputId}
                                              aria-label={slot.label}
                                              checked={slotValue === true}
                                              color="info"
                                              onCheckedChange={(checked) => {
                                                setControllerSlotValue(
                                                  slot,
                                                  checked,
                                                );
                                              }}
                                            />
                                          </Stack>
                                        );
                                      }

                                      return (
                                        <Stack
                                          gap={2}
                                          key={`${slot.blockKey}-${slot.slotKey}`}
                                        >
                                          <Label>{slot.label}</Label>
                                          <OptionSelect
                                            label={`Select ${slot.label}`}
                                            value={
                                              typeof slotValue === "string" ||
                                              typeof slotValue === "number"
                                                ? slotValue
                                                : slot.valueSpec.options[0]
                                            }
                                            options={getControllerEnumOptions(
                                              slot,
                                              slot.valueSpec.options,
                                            )}
                                            onChange={(value) => {
                                              setControllerSlotValue(
                                                slot,
                                                value as SlotInitialValue,
                                              );
                                            }}
                                          />
                                        </Stack>
                                      );
                                    })}
                                  </div>
                                </Stack>
                              </Surface>
                            );
                          })}
                        </div>
                      </Stack>
                    </Surface>
                  ))}
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
                    showCcMessages={false}
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
