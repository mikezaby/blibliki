import {
  formatWavetableDefinition,
  moduleSchemas,
  ModuleType,
  parseWavetableDefinition,
  exportWavetableScanToWavBytes,
  extractEmbeddedWavetableTablesFromWavBytes,
  extractWavetableTablesFromAudioBuffer,
} from "@blibliki/engine";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Fader,
  Input,
  Stack,
  Surface,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  uiTone,
  uiVars,
} from "@blibliki/ui";
import type { MarkProps } from "@blibliki/ui";
import { AudioContext } from "@blibliki/utils/web-audio-api";
import { Download, Edit2, Plus, Trash2, Upload, Waves } from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { ModuleComponent } from "..";
import Container from "../Container";
import {
  clonePresetTables,
  getPresetById,
  getPresetIdByTables,
  WAVETABLE_PRESETS,
} from "./presets";
import { buildPreviewWaveforms, getInterpolationState } from "./preview";

const CENTER: MarkProps[] = [{ value: 0, label: "" }];
const OCTAVE_MARKS: MarkProps[] = [
  { value: -1, label: "-1" },
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
];
const POSITION_MARKS: MarkProps[] = [
  { value: 0, label: "0" },
  { value: 0.5, label: "0.5" },
  { value: 1, label: "1" },
];

const PREVIEW_WIDTH = 640;
const PREVIEW_HEIGHT = 180;
const PREVIEW_POINT_COUNT = 96;
const IMPORT_WAV_TABLE_COUNT = 32;
const IMPORT_WAV_FRAME_SIZE = 2048;
const IMPORT_WAV_HARMONICS = 1024;
const EXPORT_WAV_SAMPLE_RATE = 44100;
const EXPORT_WAV_FRAME_SAMPLES = 2048;
const CUSTOM_PRESET_ID = "__custom__";

const schema = moduleSchemas[ModuleType.Wavetable];

const createDefaultTable = () => ({
  real: [0, 0],
  imag: [0, 0],
});

type ModalView = "list" | "edit";

const Wavetable: ModuleComponent<ModuleType.Wavetable> = (props) => {
  const {
    updateProp,
    state,
    props: { tables, position, octave, coarse, fine },
  } = props;
  const actualPosition = state?.actualPosition ?? position;

  const safeTables = useMemo(() => {
    if (tables.length > 0) return tables;
    return [createDefaultTable()];
  }, [tables]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState<ModalView>("list");
  const [editorValue, setEditorValue] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editingTableIndex, setEditingTableIndex] = useState<number | null>(
    null,
  );
  const [wavError, setWavError] = useState<string | null>(null);
  const [isImportingWav, setIsImportingWav] = useState(false);
  const [isExportingWav, setIsExportingWav] = useState(false);
  const wavFileInputRef = useRef<HTMLInputElement | null>(null);

  const interpolationState = useMemo(() => {
    return getInterpolationState(actualPosition, safeTables.length);
  }, [actualPosition, safeTables.length]);

  const previewWaveforms = useMemo(() => {
    return buildPreviewWaveforms(safeTables, PREVIEW_POINT_COUNT);
  }, [safeTables]);

  const selectedPresetId = useMemo(() => {
    return getPresetIdByTables(safeTables) ?? CUSTOM_PRESET_ID;
  }, [safeTables]);

  const playbackLabel = useMemo(() => {
    if (interpolationState.fromIndex === interpolationState.toIndex) {
      return `Playing step ${interpolationState.fromIndex + 1}`;
    }

    const fromAmount = Math.round((1 - interpolationState.mix) * 100);
    const toAmount = Math.round(interpolationState.mix * 100);
    return `Blend ${interpolationState.fromIndex + 1} (${fromAmount}%) -> ${interpolationState.toIndex + 1} (${toAmount}%)`;
  }, [interpolationState]);

  const setTables = (nextTables: typeof safeTables) => {
    updateProp("tables")(nextTables);
  };

  const openEditTable = (tableIndex: number) => {
    const table = safeTables[tableIndex] ?? createDefaultTable();
    setEditingTableIndex(tableIndex);
    setEditorValue(formatWavetableDefinition(table));
    setEditorError(null);
    setModalView("edit");
  };

  const addTable = () => {
    const newTable = createDefaultTable();
    const nextTables = [...safeTables, newTable];
    setTables(nextTables);
    setEditingTableIndex(nextTables.length - 1);
    setEditorValue(formatWavetableDefinition(newTable));
    setEditorError(null);
    setModalView("edit");
  };

  const removeTable = (tableIndex: number) => {
    if (safeTables.length <= 1) return;

    const nextTables = safeTables.filter((_, index) => index !== tableIndex);
    setTables(nextTables);
  };

  const applyPreset = (presetId: string) => {
    if (presetId === CUSTOM_PRESET_ID) return;

    const preset = getPresetById(presetId);
    if (!preset) return;

    updateProp("position")(0);
    setTables(clonePresetTables(preset.tables));
    setWavError(null);
  };

  const triggerImportWav = () => {
    setWavError(null);
    wavFileInputRef.current?.click();
  };

  const handleWavFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImportingWav(true);
    setWavError(null);

    const audioContext = new AudioContext();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const embeddedTables = extractEmbeddedWavetableTablesFromWavBytes(
        new Uint8Array(arrayBuffer),
      );
      if (embeddedTables && embeddedTables.length > 0) {
        setTables(embeddedTables);
        updateProp("position")(0);
        return;
      }

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const nextTables = extractWavetableTablesFromAudioBuffer(audioBuffer, {
        tableCount: IMPORT_WAV_TABLE_COUNT,
        frameSize: IMPORT_WAV_FRAME_SIZE,
        harmonics: IMPORT_WAV_HARMONICS,
      });
      setTables(nextTables);
      updateProp("position")(0);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import WAV file";
      setWavError(message);
    } finally {
      setIsImportingWav(false);
      void audioContext.close();
    }
  };

  const exportWav = () => {
    try {
      setIsExportingWav(true);
      setWavError(null);

      const bytes = exportWavetableScanToWavBytes({
        tables: safeTables,
        sampleRate: EXPORT_WAV_SAMPLE_RATE,
        frameSampleCount: EXPORT_WAV_FRAME_SAMPLES,
      });
      const wavBytes = new Uint8Array(bytes.byteLength);
      wavBytes.set(bytes);
      const blob = new Blob([wavBytes.buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "wavetable-scan.wav";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export WAV file";
      setWavError(message);
    } finally {
      setIsExportingWav(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsModalOpen(open);

    if (open) {
      setModalView("list");
      setEditingTableIndex(null);
      setEditorError(null);
    }
  };

  const applyEditedTable = () => {
    if (editingTableIndex === null) return;

    try {
      const parsed = parseWavetableDefinition(editorValue);
      const nextTables = safeTables.map((table, index) =>
        index === editingTableIndex ? parsed : table,
      );
      setTables(nextTables);
      setEditorError(null);
      setEditingTableIndex(null);
      setModalView("list");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid wavetable format";
      setEditorError(message);
    }
  };

  const backToList = () => {
    setModalView("list");
    setEditingTableIndex(null);
    setEditorError(null);
  };

  return (
    <Stack gap={6}>
      <Container direction="column" className="items-stretch gap-y-3">
        <Surface
          tone="subtle"
          border="subtle"
          radius="lg"
          className="space-y-3 p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-tight">
                Wavetable Bank
              </p>
              <p className="text-xs" style={{ color: uiVars.text.muted }}>
                {safeTables.length} tables • {playbackLabel}
              </p>
              <p className="text-xs" style={{ color: uiVars.text.muted }}>
                Base {position.toFixed(3)} • Actual {actualPosition.toFixed(3)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                ref={wavFileInputRef}
                type="file"
                accept=".wav,audio/wav,audio/wave,audio/x-wav"
                className="hidden"
                onChange={(event) => {
                  void handleWavFileChange(event);
                }}
              />
              <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outlined">
                    Edit Wavetable Config
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-xl max-w-[calc(100vw-2rem)] p-0 gap-0">
                  <div className="flex items-center gap-3 p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-t-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-sm">
                      <Waves className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
                        {modalView === "list"
                          ? "Wavetable Tables"
                          : "Edit Wavetable Table"}
                      </DialogTitle>
                      <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                        {modalView === "list"
                          ? "Add, edit, or delete tables in the wavetable bank."
                          : "Edit a single table using real/imag coefficient arrays."}
                      </DialogDescription>
                    </div>
                  </div>

                  {modalView === "list" ? (
                    <>
                      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            tables[{safeTables.length}]
                          </p>
                          <Button
                            size="sm"
                            variant="outlined"
                            className="gap-1"
                            onClick={addTable}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add New
                          </Button>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800 max-h-[24rem] overflow-y-auto space-y-2">
                        {safeTables.map((table, index) => (
                          <div
                            key={`wavetable-table-${index}`}
                            className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                Table {index + 1}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                real[{table.real.length}] • imag[
                                {table.imag.length}]
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="text"
                                color="secondary"
                                className="h-8 w-8"
                                onClick={() => {
                                  openEditTable(index);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="text"
                                color="error"
                                className="h-8 w-8"
                                onClick={() => {
                                  removeTable(index);
                                }}
                                disabled={safeTables.length <= 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-lg">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="text"
                            color="secondary"
                            onClick={() => {
                              setIsModalOpen(false);
                            }}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          table {(editingTableIndex ?? 0) + 1}/
                          {safeTables.length} • format:{" "}
                          {"{ real: [...], imag: [...] }"}
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800">
                        <Textarea
                          size="sm"
                          resize="vertical"
                          rows={20}
                          value={editorValue}
                          onChange={(event) => {
                            setEditorValue(event.target.value);
                            if (editorError) setEditorError(null);
                          }}
                          className="w-full min-h-[20rem] p-3 font-mono text-xs"
                          spellCheck={false}
                        />

                        {editorError ? (
                          <p className="mt-3 text-sm text-red-500 dark:text-red-400">
                            {editorError}
                          </p>
                        ) : null}
                      </div>

                      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-lg">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="text"
                            color="secondary"
                            onClick={backToList}
                          >
                            Back
                          </Button>
                          <Button onClick={applyEditedTable}>Save</Button>
                        </div>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
              <Button
                size="sm"
                variant="outlined"
                className="gap-1"
                onClick={triggerImportWav}
                disabled={isImportingWav}
              >
                <Upload className="h-3.5 w-3.5" />
                {isImportingWav ? "Importing..." : "Import WAV"}
              </Button>
              <Button
                size="sm"
                variant="outlined"
                className="gap-1"
                onClick={exportWav}
                disabled={isExportingWav}
              >
                <Download className="h-3.5 w-3.5" />
                {isExportingWav ? "Exporting..." : "Export WAV"}
              </Button>
            </div>
          </div>

          {wavError ? (
            <p className="text-xs" style={{ color: uiTone("error", "600") }}>
              {wavError}
            </p>
          ) : null}

          <Surface
            tone="panel"
            border="subtle"
            radius="md"
            className="space-y-2 p-3"
          >
            <p className="text-xs font-semibold">Preset</p>
            <Select value={selectedPresetId} onValueChange={applyPreset}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CUSTOM_PRESET_ID}>Custom</SelectItem>
                {WAVETABLE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Surface>

          <Stack gap={2}>
            <Stack direction="row" gap={2} className="flex-col sm:flex-row">
              <Surface
                tone="panel"
                border="subtle"
                radius="md"
                className="h-44 flex-1 overflow-hidden p-2"
              >
                <svg
                  className="h-full w-full"
                  viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
                  preserveAspectRatio="none"
                >
                  {previewWaveforms.map((points, tableIndex) => {
                    const laneHeight = PREVIEW_HEIGHT / safeTables.length;
                    const centerY = laneHeight * tableIndex + laneHeight / 2;
                    const amplitude = laneHeight * 0.4;
                    const tablePoints = points
                      .map((value, pointIndex) => {
                        const x =
                          (pointIndex / (points.length - 1 || 1)) *
                          PREVIEW_WIDTH;
                        const y = centerY - value * amplitude;
                        return `${x},${y}`;
                      })
                      .join(" ");

                    let blend = 0;
                    if (tableIndex === interpolationState.fromIndex) {
                      blend = Math.max(blend, 1 - interpolationState.mix);
                    }
                    if (tableIndex === interpolationState.toIndex) {
                      blend = Math.max(blend, interpolationState.mix);
                    }
                    if (
                      interpolationState.fromIndex ===
                        interpolationState.toIndex &&
                      tableIndex === interpolationState.fromIndex
                    ) {
                      blend = 1;
                    }

                    const strokeColor =
                      blend > 0
                        ? `rgba(139, 92, 246, ${0.35 + blend * 0.65})`
                        : "rgba(148, 163, 184, 0.35)";

                    return (
                      <polyline
                        key={`wave-preview-${tableIndex}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={blend > 0 ? 1.8 : 1}
                        points={tablePoints}
                      />
                    );
                  })}
                </svg>
              </Surface>

              <Surface
                tone="panel"
                border="subtle"
                radius="md"
                className="flex shrink-0 items-center justify-center px-1 sm:w-[90px] sm:px-0"
              >
                <Fader
                  name="Position"
                  marks={POSITION_MARKS}
                  min={schema.position.min}
                  max={schema.position.max}
                  step={schema.position.step}
                  exp={schema.position.exp}
                  onChange={updateProp("position")}
                  value={position}
                />
              </Surface>
            </Stack>
          </Stack>
        </Surface>
      </Container>

      <Container>
        <Fader
          name="Octave"
          marks={OCTAVE_MARKS}
          min={schema.octave.min}
          max={schema.octave.max}
          step={schema.octave.step}
          exp={schema.octave.exp}
          onChange={updateProp("octave")}
          value={octave}
        />
        <Fader
          name="Coarse"
          marks={CENTER}
          min={schema.coarse.min}
          max={schema.coarse.max}
          step={schema.coarse.step}
          exp={schema.coarse.exp}
          onChange={updateProp("coarse")}
          value={coarse}
        />
        <Fader
          name="Fine"
          marks={CENTER}
          min={schema.fine.min}
          max={schema.fine.max}
          step={schema.fine.step}
          exp={schema.fine.exp}
          onChange={updateProp("fine")}
          value={fine}
        />
      </Container>
    </Stack>
  );
};

export default Wavetable;
