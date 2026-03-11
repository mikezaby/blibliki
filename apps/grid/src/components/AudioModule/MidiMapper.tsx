import {
  type MidiMapping,
  MidiMappingMode,
  ModuleType,
  moduleSchemas,
} from "@blibliki/engine";
import {
  Button,
  Input,
  Label,
  OptionSelect,
  Stack,
  Surface,
  Text,
} from "@blibliki/ui";
import { ChevronDown, ChevronUp, SquarePlus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/hooks";
import type { RootState } from "@/store";
import { ModuleComponent } from ".";
import Container from "./Container";
import { initialize } from "./MidiInput/midiDevicesSlice";
import { moduleInfoSelector, type ModuleInfo } from "./modulesSlice";

const MidiMapper: ModuleComponent<ModuleType.MidiMapper> = (props) => {
  const {
    updateProp,
    props: { tracks, activeTrack, globalMappings },
  } = props;

  const dispatch = useAppDispatch();
  const modules = useSelector<RootState, ModuleInfo[]>((state) =>
    moduleInfoSelector.selectAll(state),
  );
  const moduleOptions = useMemo(
    () => modules.map(({ id, name }) => ({ id, name })),
    [modules],
  );

  const track = tracks[activeTrack];
  const trackMappings = track?.mappings ?? [{}];

  // Track whether we're viewing global or track-specific mappings
  const [viewMode, setViewMode] = useState<"track" | "global">("track");

  // Get the active mappings based on view mode
  const mappings = viewMode === "global" ? globalMappings : trackMappings;

  // Track which mappings have expanded settings
  const [expandedMappings, setExpandedMappings] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    dispatch(initialize());
  }, [dispatch]);

  const toggleExpanded = (index: number) => {
    setExpandedMappings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const onAddTrack = () => {
    const newTracks = [
      ...tracks,
      { name: `Track ${tracks.length + 1}`, mappings: [{}] },
    ];
    updateProp("tracks")(newTracks);
  };

  const onRemoveTrack = (trackIndex: number) => {
    if (tracks.length <= 1) return; // Keep at least one track

    const newTracks = tracks.filter((_, index) => index !== trackIndex);
    const newActiveTrack =
      activeTrack >= newTracks.length ? newTracks.length - 1 : activeTrack;

    updateProp("tracks")(newTracks);
    updateProp("activeTrack")(newActiveTrack);
  };

  const onUpdateTrackName = (trackIndex: number, name: string) => {
    const newTracks = tracks.map((track, index) =>
      index === trackIndex ? { ...track, name } : track,
    );
    updateProp("tracks")(newTracks);
  };

  const onSwitchTrack = (trackIndex: number) => {
    updateProp("activeTrack")(trackIndex);
  };

  const onAdd = () => {
    updateMappings([...mappings, {}]);
  };

  const updateMappings = (
    updatedMappings: Partial<MidiMapping<ModuleType>>[],
  ) => {
    if (viewMode === "global") {
      updateProp("globalMappings")(updatedMappings);
    } else {
      const newTracks = tracks.map((track, index) =>
        index === activeTrack ? { ...track, mappings: updatedMappings } : track,
      );
      updateProp("tracks")(newTracks);
    }
  };

  const updateMappedCC = ({ cc, index }: { cc: number; index: number }) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      cc,
    };
    updateMappings(updatedMappings);
  };

  const updateMappedAutoAssign = ({ index }: { index: number }) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      autoAssign: true,
    };
    updateMappings(updatedMappings);
  };

  const updateMappedModuleId = ({
    id,
    index,
  }: {
    id: string;
    index: number;
  }) => {
    const updatedMappings = [...mappings];
    const module = modules.find(({ id: mId }) => mId === id);
    if (!module) throw Error(`Module with id ${id} not exists`);

    updatedMappings[index] = {
      ...updatedMappings[index],
      moduleId: module.id,
      moduleType: module.moduleType,
    };
    updateMappings(updatedMappings);
  };

  const updateMappedProp = ({
    propName,
    index,
  }: {
    propName: string;
    index: number;
  }) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      propName,
    };
    updateMappings(updatedMappings);
  };

  const updateMappedMode = ({
    mode,
    index,
  }: {
    mode: MidiMappingMode;
    index: number;
  }) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      mode,
    };
    updateMappings(updatedMappings);
  };

  const updateMappedThreshold = ({
    threshold,
    index,
  }: {
    threshold: number;
    index: number;
  }) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      threshold,
    };
    updateMappings(updatedMappings);
  };

  const updateMappedStep = ({
    step,
    index,
  }: {
    step: number;
    index: number;
  }) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      step,
    };
    updateMappings(updatedMappings);
  };

  const onRemoveMapping = (index: number) => {
    const updatedMappings = mappings.filter((_, i) => i !== index);
    updateMappings(updatedMappings);
  };

  return (
    <Container direction="column" className="gap-6">
      {/* Track Navigation */}
      <Surface tone="subtle" border="subtle" radius="lg" className="p-4">
        <Stack gap={3}>
          <Stack direction="row" align="center" justify="between">
            <Text asChild size="sm" weight="semibold">
              <h3>Track Navigation</h3>
            </Text>
            <Text asChild tone="muted" size="xs">
              <span>
                {activeTrack + 1} / {tracks.length}
              </span>
            </Text>
          </Stack>

          <Stack direction="row" gap={2} className="flex-wrap">
            <Button
              variant="outlined"
              size="sm"
              disabled={activeTrack === 0}
              onClick={() => {
                onSwitchTrack(activeTrack - 1);
              }}
              className="flex-1"
            >
              {"← Previous"}
            </Button>
            <Button
              variant="outlined"
              size="sm"
              disabled={activeTrack === tracks.length - 1}
              onClick={() => {
                onSwitchTrack(activeTrack + 1);
              }}
              className="flex-1"
            >
              {"Next →"}
            </Button>
            <Button size="sm" onClick={onAddTrack}>
              <SquarePlus className="w-4 h-4" />
              New Track
            </Button>
          </Stack>
        </Stack>
      </Surface>

      {/* Track Settings */}
      <Surface
        tone="subtle"
        border="subtle"
        radius="lg"
        className="bg-gradient-to-br from-surface-subtle to-surface-panel p-4"
      >
        <Stack gap={3}>
          <Text asChild size="sm" weight="semibold">
            <h3>Track Settings</h3>
          </Text>

          <Stack direction="row" align="center" gap={4} className="flex-wrap">
            <Stack direction="row" align="center" gap={2} className="flex-1">
              <Label className="min-w-fit text-sm font-medium">
                Track Name
              </Label>
              <Input
                className="flex-1"
                value={track?.name ?? `Track ${activeTrack + 1}`}
                onChange={(e) => {
                  onUpdateTrackName(activeTrack, e.currentTarget.value);
                }}
              />
            </Stack>
            <Button
              color="error"
              size="sm"
              disabled={tracks.length <= 1}
              onClick={() => {
                onRemoveTrack(activeTrack);
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </Stack>
        </Stack>
      </Surface>

      {/* View Mode Toggle */}
      <Surface tone="subtle" border="subtle" radius="lg" className="p-4">
        <Stack gap={3}>
          <Text asChild size="sm" weight="semibold">
            <h3>Mapping Scope</h3>
          </Text>

          <Stack direction="row" gap={2}>
            <Button
              variant={viewMode === "track" ? "contained" : "outlined"}
              size="sm"
              onClick={() => {
                setViewMode("track");
              }}
              className="flex-1"
            >
              Track Mappings
            </Button>
            <Button
              variant={viewMode === "global" ? "contained" : "outlined"}
              size="sm"
              onClick={() => {
                setViewMode("global");
              }}
              className="flex-1"
            >
              Global Mappings
            </Button>
          </Stack>
          <Text tone="muted" size="xs">
            {viewMode === "track"
              ? "These mappings apply only to the current track"
              : "These mappings are available on all tracks"}
          </Text>
        </Stack>
      </Surface>

      {/* MIDI Mappings */}
      <Stack gap={4}>
        <Stack
          direction="row"
          align="center"
          justify="between"
          className="px-1"
        >
          <Text asChild size="sm" weight="semibold">
            <h3>{viewMode === "global" ? "Global " : "Track "}MIDI Mappings</h3>
          </Text>
          <Text asChild tone="muted" size="xs">
            <span>
              {mappings.length} {mappings.length === 1 ? "mapping" : "mappings"}
            </span>
          </Text>
        </Stack>

        <Stack gap={3}>
          {mappings.map((mapping, i) => {
            const isExpanded = expandedMappings.has(i);
            const mode = mapping.mode ?? "direct";

            return (
              <Surface
                key={`${viewMode}-${activeTrack}-${i}`}
                tone="raised"
                border="subtle"
                radius="lg"
                className="flex flex-col gap-3 p-3"
              >
                {/* Main mapping row */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="min-w-fit text-xs font-medium">CC</Label>
                    <Input
                      className="w-24 text-center font-mono"
                      type="text"
                      value={mapping.autoAssign ? "Mapping..." : mapping.cc}
                      placeholder="Unmapped"
                      readOnly
                      onClick={() => {
                        updateMappedAutoAssign({ index: i });
                      }}
                      onChange={(e) => {
                        updateMappedCC({
                          cc: Number(e.currentTarget.value),
                          index: i,
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <OptionSelect
                      label="Select module"
                      value={mapping.moduleId ?? ""}
                      options={moduleOptions}
                      onChange={(value: string) => {
                        updateMappedModuleId({ id: value, index: i });
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <OptionSelect
                      label="Select prop"
                      value={mapping.propName ?? ""}
                      options={
                        mapping.moduleType
                          ? Object.keys(moduleSchemas[mapping.moduleType])
                          : []
                      }
                      disabled={!mapping.moduleType}
                      onChange={(value: string) => {
                        updateMappedProp({ propName: value, index: i });
                      }}
                    />
                  </div>

                  <Button
                    variant="text"
                    size="icon"
                    onClick={() => {
                      toggleExpanded(i);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant="text"
                    size="icon"
                    onClick={() => {
                      onRemoveMapping(i);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Advanced settings (expandable) */}
                {isExpanded && (
                  <div className="flex flex-col gap-3 border-t border-border-subtle pt-3">
                    <div className="flex items-center gap-2">
                      <Label className="min-w-[80px] text-xs font-medium">
                        Mode
                      </Label>
                      <OptionSelect
                        label="Select mode"
                        value={mode}
                        options={[
                          { id: MidiMappingMode.direct, name: "Direct" },
                          {
                            id: MidiMappingMode.directRev,
                            name: "Direct (rev)",
                          },
                          { id: MidiMappingMode.toggleInc, name: "Toggle inc" },
                          { id: MidiMappingMode.toggleDec, name: "Toggle dec" },
                          { id: MidiMappingMode.incDec, name: "Inc/Dec" },
                          {
                            id: MidiMappingMode.incDecRev,
                            name: "Inc/Dec (rev)",
                          },
                        ]}
                        onChange={(value: string) => {
                          updateMappedMode({
                            mode: value as MidiMappingMode,
                            index: i,
                          });
                        }}
                      />
                      <Text asChild tone="muted" size="xs">
                        <span className="ml-2">
                          {mode === MidiMappingMode.direct &&
                            "Maps MIDI value directly to parameter"}
                          {mode === MidiMappingMode.directRev &&
                            "Maps MIDI value directly to parameter reverse"}
                          {mode === MidiMappingMode.toggleInc &&
                            "Only responds to button press (127)"}
                          {mode === MidiMappingMode.toggleDec &&
                            "Only responds to button press (127)"}
                          {mode === MidiMappingMode.incDec &&
                            "Increment/decrement based on threshold"}
                          {mode === MidiMappingMode.incDecRev &&
                            "Increment/decrement based on threshold reverse"}
                        </span>
                      </Text>
                    </div>

                    {(mode === MidiMappingMode.incDec ||
                      mode === MidiMappingMode.incDecRev) && (
                      <>
                        <div className="flex items-center gap-2">
                          <Label className="min-w-[80px] text-xs font-medium">
                            Threshold
                          </Label>
                          <Input
                            className="w-24 text-center"
                            type="number"
                            min={0}
                            max={127}
                            value={mapping.threshold ?? 64}
                            onChange={(e) => {
                              updateMappedThreshold({
                                threshold: Number(e.currentTarget.value),
                                index: i,
                              });
                            }}
                          />
                          <Text asChild tone="muted" size="xs">
                            <span className="ml-2">
                              Value &gt; threshold increments, ≤ threshold
                              decrements
                            </span>
                          </Text>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="min-w-[80px] text-xs font-medium">
                            Step
                          </Label>
                          <Input
                            className="w-24 text-center"
                            type="number"
                            step="any"
                            value={mapping.step ?? ""}
                            placeholder="Auto"
                            onChange={(e) => {
                              const value = e.currentTarget.value;
                              if (value === "") {
                                // Remove custom step, will use propSchema.step
                                const updatedMappings = [...mappings];
                                const currentMapping = updatedMappings[i];
                                if (
                                  currentMapping &&
                                  "step" in currentMapping
                                ) {
                                  const { step: _, ...rest } = currentMapping;
                                  updatedMappings[i] = rest;
                                  updateMappings(updatedMappings);
                                }
                              } else {
                                updateMappedStep({
                                  step: Number(value),
                                  index: i,
                                });
                              }
                            }}
                          />
                          <Text asChild tone="muted" size="xs">
                            <span className="ml-2">
                              Amount to increment/decrement (leave empty for
                              auto)
                            </span>
                          </Text>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Surface>
            );
          })}
        </Stack>
      </Stack>

      <Button onClick={onAdd} variant="outlined">
        <SquarePlus className="w-4 h-4" />
        Add New Mapping
      </Button>
    </Container>
  );
};

export default MidiMapper;
