import {
  ModuleType,
  ModuleTypeToPropsMapping,
  cloneWavetablePresetTables,
  getWavetablePresetById,
  moduleSchemas,
  type PropSchema,
} from "@blibliki/engine";
import {
  compileTrack,
  createTrackFromDocument,
  getGlobalControlValueSpec,
  launchControlXL3GlobalRow,
  migrateInstrumentDocument,
  type MacroEncoder,
  type MacroMapping,
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
  AutocompleteSelect,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Encoder,
  Fader,
  IconButton,
  Input,
  Label,
  OptionSelect,
  Stack,
  Switch,
  Surface,
  Text,
} from "@blibliki/ui";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable, isSortable } from "@dnd-kit/react/sortable";
import { Link } from "@tanstack/react-router";
import { GripVertical, Pencil, Save } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
  updateGlobalBlock,
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
  "none",
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

// Global-row knobs that carry reorderable macro encoders (knobs 3-6).
const MACRO_SLOT_IDS = launchControlXL3GlobalRow
  .filter((control) => !control.key && control.slotId)
  .map((control) => control.slotId!);

type MacroTargetOption = {
  name: string;
  value: string;
  moduleId: string;
  propKey: string;
  min: number;
  max: number;
  exp?: number;
  searchText: string;
};

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
      const partialProps = props as Partial<
        ModuleTypeToPropsMapping[ModuleType.Wavetable]
      >;
      const existingTables = partialProps.tables;
      const preset = !existingTables
        ? getWavetablePresetById(partialProps.presetId ?? "")
        : null;
      const propsWithTables = {
        ...(props as ModuleTypeToPropsMapping[ModuleType.Wavetable]),
        tables:
          existingTables ??
          (preset ? cloneWavetablePresetTables(preset.tables) : []),
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

function getModuleSchema(moduleType: ModuleType): Record<string, PropSchema> {
  return moduleSchemas[moduleType];
}

function getTrackLabel(track: InstrumentTrackDocument) {
  return track.name?.trim().length ? track.name : track.key;
}

function createTrackMacroTargetOptions(
  track: InstrumentTrackDocument,
  modules: NonNullable<ReturnType<typeof compileTrack>>["engine"]["modules"],
): MacroTargetOption[] {
  const options: MacroTargetOption[] = [];
  const trackLabel = getTrackLabel(track);

  modules.forEach((module) => {
    const schema = getModuleSchema(module.moduleType);

    Object.entries(schema).forEach(([propKey, propSchema]) => {
      if (propSchema.kind !== "number") {
        return;
      }

      const scopedModuleId = `${track.key}.${module.id}`;
      const name = `${trackLabel} / ${module.id} / ${propSchema.label}`;

      options.push({
        name,
        value: `${scopedModuleId}.${propKey}`,
        moduleId: scopedModuleId,
        propKey,
        min: propSchema.min,
        max: propSchema.max,
        exp: propSchema.exp,
        searchText:
          `${name} ${track.key} ${module.id} ${propKey} ${propSchema.shortLabel}`.toLowerCase(),
      });
    });
  });

  return options;
}

function getPreferredMacroTarget(
  options: MacroTargetOption[],
): MacroTargetOption | undefined {
  return (
    options.find(
      (option) =>
        option.moduleId.endsWith(".filter.main") && option.propKey === "cutoff",
    ) ?? options[0]
  );
}

function createMacroMapping(option: MacroTargetOption): MacroMapping {
  // min/max are signed offsets from the target's base value (not absolute
  // values). Default to a full upward sweep; rest (0) leaves the base untouched.
  return {
    moduleId: option.moduleId,
    propKey: option.propKey,
    min: 0,
    max: option.max - option.min,
    exp: option.exp,
    inverted: false,
  };
}

function updateGlobalMacro(
  document: InstrumentDocument,
  macroId: string,
  update: (macro: MacroEncoder) => MacroEncoder,
): InstrumentDocument {
  const next = cloneInstrumentDocument(document);

  next.globalController.macros = next.globalController.macros.map((macro) =>
    macro.id === macroId ? update(macro) : macro,
  );

  return next;
}

function updateMacroMapping(
  document: InstrumentDocument,
  macroId: string,
  mappingIndex: number,
  update: (mapping: MacroMapping) => MacroMapping,
): InstrumentDocument {
  return updateGlobalMacro(document, macroId, (macro) => ({
    ...macro,
    mappings: macro.mappings.map((mapping, index) =>
      index === mappingIndex ? update(mapping) : mapping,
    ),
  }));
}

function getOrderedMappingRange(mapping: MacroMapping) {
  const min = mapping.min ?? 0;
  const max = mapping.max ?? 1;

  return min <= max ? { min, max } : { min: max, max: min };
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

type SortableMacroEncoderProps = {
  macro: MacroEncoder;
  index: number;
  editDialog: ReactNode;
  onValueChange: (value: number) => void;
};

// One reorderable macro knob. The grip is the drag handle; dnd-kit shifts the
// neighbouring knobs live so the drop position is visible before releasing.
function SortableMacroEncoder({
  macro,
  index,
  editDialog,
  onValueChange,
}: SortableMacroEncoderProps) {
  const { ref, handleRef, isDragging } = useSortable({ id: macro.id, index });

  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-2"
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <Stack direction="row" align="center" gap={1}>
        <IconButton
          ref={handleRef}
          icon={<GripVertical size={14} />}
          aria-label={`Reorder ${macro.name}`}
          size="xs"
          className="cursor-grab touch-none active:cursor-grabbing"
        />
        {editDialog}
      </Stack>
      <Encoder
        name={macro.name}
        value={macro.value}
        min={macro.polarity === "bipolar" ? -1 : 0}
        max={1}
        step={0.01}
        onChange={onValueChange}
      />
      <Text
        tone="muted"
        size="xs"
        className="text-center uppercase tracking-wide"
      >
        {macro.name}
      </Text>
    </div>
  );
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
    () =>
      cloneInstrumentDocument(
        migrateInstrumentDocument(instrument.document as InstrumentDocument),
      ),
    [instrument],
  );
  const [name, setName] = useState(instrument.name);
  const [document, setDocument] = useState<InstrumentDocument>(initialDocument);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [macroTargetById, setMacroTargetById] = useState<
    Record<string, string>
  >({});

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
  const macroTargetOptions = useMemo(
    () =>
      document.tracks.flatMap((track) =>
        createTrackMacroTargetOptions(
          track,
          compileTrack(createTrackFromDocument(track)).engine.modules,
        ),
      ),
    [document.tracks],
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

  const getSelectedMacroTarget = (
    macroId: string,
  ): MacroTargetOption | undefined => {
    const selectedValue = macroTargetById[macroId];
    return (
      macroTargetOptions.find((option) => option.value === selectedValue) ??
      getPreferredMacroTarget(macroTargetOptions)
    );
  };

  const setMacroEnabled = (macroId: string, enabled: boolean) => {
    setDocument((current) =>
      updateGlobalMacro(current, macroId, (macro) => ({
        ...macro,
        enabled,
      })),
    );
  };

  const setMacroName = (macroId: string, name: string) => {
    setDocument((current) =>
      updateGlobalMacro(current, macroId, (macro) => ({
        ...macro,
        name,
      })),
    );
  };

  const setMacroBipolar = (macroId: string, bipolar: boolean) => {
    setDocument((current) =>
      updateGlobalMacro(current, macroId, (macro) => ({
        ...macro,
        polarity: bipolar ? "bipolar" : "unipolar",
        // Snap to rest when switching so the encoder can't sit below a
        // unipolar macro's 0 floor.
        value: bipolar ? macro.value : Math.max(0, macro.value),
      })),
    );
  };

  const setMacroValue = (macroId: string, value: number) => {
    setDocument((current) =>
      updateGlobalMacro(current, macroId, (macro) => ({
        ...macro,
        value,
      })),
    );
  };

  // Resolve the macro mounted on a global-row slot (knobs 3-6), if any.
  const getSlotMacro = (
    slotId: string | undefined,
  ): MacroEncoder | undefined => {
    if (!slotId) return undefined;
    const assignment = document.globalController.encoderSlots[slotId];
    if (assignment?.type !== "macro") return undefined;
    return document.globalController.macros.find(
      (macro) => macro.id === assignment.macroId,
    );
  };

  // Reassign macros across the fixed global-row knobs so their visual order
  // matches the sequence produced by the drag (the others shift to fill).
  const reorderMacros = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setDocument((current) => {
      const order = MACRO_SLOT_IDS.map((id) => {
        const assignment = current.globalController.encoderSlots[id];
        return assignment?.type === "macro" ? assignment.macroId : undefined;
      });
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= order.length ||
        toIndex >= order.length
      ) {
        return current;
      }

      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);

      const encoderSlots = { ...current.globalController.encoderSlots };
      MACRO_SLOT_IDS.forEach((id, index) => {
        const macroId = order[index];
        if (macroId) encoderSlots[id] = { type: "macro", macroId };
      });

      return {
        ...current,
        globalController: { ...current.globalController, encoderSlots },
      };
    });
  };

  const addMacroMapping = (macroId: string) => {
    const selectedTarget = getSelectedMacroTarget(macroId);
    if (!selectedTarget) {
      return;
    }

    setDocument((current) =>
      updateGlobalMacro(current, macroId, (macro) => ({
        ...macro,
        mappings: [...macro.mappings, createMacroMapping(selectedTarget)],
      })),
    );
  };

  const setMacroMappingRange = (
    macroId: string,
    mappingIndex: number,
    key: "min" | "max",
    value: number,
  ) => {
    setDocument((current) =>
      updateMacroMapping(current, macroId, mappingIndex, (mapping) => {
        const range = getOrderedMappingRange(mapping);
        const nextRange =
          key === "min"
            ? { min: value, max: Math.max(value, range.max) }
            : { min: Math.min(range.min, value), max: value };

        return {
          ...mapping,
          ...nextRange,
        };
      }),
    );
  };

  const setMacroMappingInverted = (
    macroId: string,
    mappingIndex: number,
    inverted: boolean,
  ) => {
    setDocument((current) =>
      updateMacroMapping(current, macroId, mappingIndex, (mapping) => ({
        ...mapping,
        inverted,
      })),
    );
  };

  const renderManageMacroDialog = (
    macro: MacroEncoder,
    index: number,
    trigger: ReactNode,
  ) => {
    const macroNo = index + 1;
    const nameInputId = `macro-${macro.id}-name`;
    const selectedTarget = getSelectedMacroTarget(macro.id);

    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[calc(100vh-4rem)] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{`Manage Macro ${macroNo}`}</DialogTitle>
            <DialogDescription>
              Edit the macro name, activation state, and target mappings.
            </DialogDescription>
          </DialogHeader>

          <Stack gap={5}>
            <Stack
              direction="row"
              align="center"
              justify="between"
              gap={3}
              className="flex-wrap"
            >
              <Stack gap={2} className="min-w-64 flex-1">
                <Label htmlFor={nameInputId}>{`Macro ${macroNo} Name`}</Label>
                <Input
                  id={nameInputId}
                  value={macro.name}
                  onChange={(event) => {
                    setMacroName(macro.id, event.target.value);
                  }}
                />
              </Stack>
              <Stack direction="row" align="center" gap={3}>
                <Text tone="muted" size="sm">
                  Bipolar
                </Text>
                <Switch
                  aria-label={`Make Macro ${macroNo} bipolar`}
                  checked={macro.polarity === "bipolar"}
                  color="info"
                  onCheckedChange={(bipolar) => {
                    setMacroBipolar(macro.id, bipolar);
                  }}
                />
                <Text tone="muted" size="sm">
                  Enabled
                </Text>
                <Switch
                  aria-label={`Enable Macro ${macroNo}`}
                  checked={macro.enabled}
                  color="info"
                  onCheckedChange={(enabled) => {
                    setMacroEnabled(macro.id, enabled);
                  }}
                />
              </Stack>
            </Stack>

            <Surface tone="subtle" border="subtle" className="p-4">
              <Stack gap={3}>
                <Stack gap={2}>
                  <Label>{`Macro ${macroNo} Target`}</Label>
                  <AutocompleteSelect
                    label={`Macro ${macroNo} Targets`}
                    value={selectedTarget?.value}
                    options={macroTargetOptions}
                    searchPlaceholder="Search by track, module, or prop"
                    emptyText="No numeric targets match the current search"
                    className="w-full"
                    triggerClassName="w-full"
                    onChange={(value) => {
                      if (typeof value !== "string") {
                        return;
                      }

                      setMacroTargetById((current) => ({
                        ...current,
                        [macro.id]: value,
                      }));
                    }}
                  />
                </Stack>

                <Button
                  type="button"
                  variant="outlined"
                  color="neutral"
                  disabled={!selectedTarget}
                  onClick={() => {
                    addMacroMapping(macro.id);
                  }}
                >
                  {`Add Macro ${macroNo} Mapping`}
                </Button>
              </Stack>
            </Surface>

            {macro.mappings.map((mapping, mappingIndex) => {
              const range = getOrderedMappingRange(mapping);
              const targetName =
                macroTargetOptions.find(
                  (option) =>
                    option.moduleId === mapping.moduleId &&
                    option.propKey === mapping.propKey,
                )?.name ?? `${mapping.moduleId}.${mapping.propKey}`;

              return (
                <Surface
                  key={`${mapping.moduleId}.${mapping.propKey}.${mappingIndex}`}
                  tone="panel"
                  border="subtle"
                  className="p-3"
                >
                  <Stack gap={3}>
                    <Text size="sm" weight="medium">
                      {targetName}
                    </Text>
                    <div className="grid grid-cols-2 gap-3">
                      <Stack gap={2}>
                        <Label
                          htmlFor={`macro-${macro.id}-mapping-${mappingIndex}-min`}
                        >
                          Min offset
                        </Label>
                        <Input
                          id={`macro-${macro.id}-mapping-${mappingIndex}-min`}
                          type="number"
                          value={range.min}
                          onChange={(event) => {
                            const value = event.target.valueAsNumber;
                            if (!Number.isFinite(value)) {
                              return;
                            }
                            setMacroMappingRange(
                              macro.id,
                              mappingIndex,
                              "min",
                              value,
                            );
                          }}
                        />
                      </Stack>
                      <Stack gap={2}>
                        <Label
                          htmlFor={`macro-${macro.id}-mapping-${mappingIndex}-max`}
                        >
                          Max offset
                        </Label>
                        <Input
                          id={`macro-${macro.id}-mapping-${mappingIndex}-max`}
                          type="number"
                          value={range.max}
                          onChange={(event) => {
                            const value = event.target.valueAsNumber;
                            if (!Number.isFinite(value)) {
                              return;
                            }
                            setMacroMappingRange(
                              macro.id,
                              mappingIndex,
                              "max",
                              value,
                            );
                          }}
                        />
                      </Stack>
                    </div>
                    <Stack
                      direction="row"
                      align="center"
                      justify="between"
                      gap={3}
                    >
                      <Text tone="muted" size="sm">
                        Invert
                      </Text>
                      <Switch
                        aria-label={`Invert Macro ${macroNo} Mapping ${
                          mappingIndex + 1
                        }`}
                        checked={mapping.inverted === true}
                        color="info"
                        onCheckedChange={(inverted) => {
                          setMacroMappingInverted(
                            macro.id,
                            mappingIndex,
                            inverted,
                          );
                        }}
                      />
                    </Stack>
                  </Stack>
                </Surface>
              );
            })}
          </Stack>
        </DialogContent>
      </Dialog>
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
                <CardTitle>Global Controls</CardTitle>
                <CardDescription>
                  Initial values for the performance global row (tempo, swing,
                  macros, prob, volume) applied when the performance starts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DragDropProvider
                  onDragEnd={(event) => {
                    if (event.canceled) return;
                    const { source } = event.operation;
                    if (!isSortable(source)) return;
                    reorderMacros(source.initialIndex, source.index);
                  }}
                >
                  <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-8">
                    {launchControlXL3GlobalRow.map((control) => {
                      // Knobs 3-6 carry reorderable macro encoders instead of a
                      // global-block key; render their default value here.
                      if (!control.key) {
                        const macro = getSlotMacro(control.slotId);
                        if (!macro) return null;

                        const macroIndex =
                          document.globalController.macros.indexOf(macro);

                        return (
                          <SortableMacroEncoder
                            key={macro.id}
                            macro={macro}
                            index={MACRO_SLOT_IDS.indexOf(control.slotId!)}
                            onValueChange={(next) => {
                              setMacroValue(macro.id, next);
                            }}
                            editDialog={renderManageMacroDialog(
                              macro,
                              macroIndex,
                              <IconButton
                                icon={<Pencil size={14} />}
                                aria-label={`Edit ${macro.name}`}
                                size="xs"
                              />,
                            )}
                          />
                        );
                      }

                      const spec = getGlobalControlValueSpec(control.key);
                      if (spec.kind !== "number") return null;

                      const controlKey = control.key;

                      return (
                        <Stack key={controlKey} align="center" gap={2}>
                          {/* Spacer matching the macro cells' handle row so all
                              encoders in the row stay vertically aligned. */}
                          <div className="h-4" />
                          <Encoder
                            name={control.label}
                            value={document.globalBlock[controlKey]}
                            min={spec.min}
                            max={spec.max}
                            step={spec.step}
                            exp={spec.exp}
                            onChange={(next) => {
                              setDocument((current) =>
                                updateGlobalBlock(current, controlKey, next),
                              );
                            }}
                          />
                          <Text
                            tone="muted"
                            size="xs"
                            className="text-center uppercase tracking-wide"
                          >
                            {control.label}
                          </Text>
                        </Stack>
                      );
                    })}
                  </div>
                </DragDropProvider>
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
