import {
  formatWavetableDefinition,
  moduleSchemas,
  ModuleType,
  parseWavetableDefinition,
  exportWavetableScanToWavBytes,
  extractEmbeddedWavetableTablesFromWavBytes,
  extractWavetableTablesFromAudioBuffer,
} from "@blibliki/engine";
import { AudioContext } from "@blibliki/utils/web-audio-api";
import {
  Box,
  Flex,
  HStack,
  Icon,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { Download, Edit2, Plus, Trash2, Upload, Waves } from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import Fader, { MarkProps } from "@/components/Fader";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <Flex direction="column" gap="8">
      <Flex direction="column" align="stretch" gap="3">
        <Flex
          direction="column"
          gap="3"
          p="3"
          rounded="lg"
          borderWidth="1px"
          borderColor="border"
          bg="bg.muted"
        >
          <Flex
            align="center"
            justify="space-between"
            gap="3"
            wrap={{ base: "wrap", md: "nowrap" }}
          >
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="fg">
                Wavetable Bank
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {safeTables.length} tables • {playbackLabel}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Base {position.toFixed(3)} • Actual {actualPosition.toFixed(3)}
              </Text>
            </Box>

            <HStack
              align="center"
              gap="2"
              wrap="wrap"
              justify={{ base: "flex-start", md: "flex-end" }}
            >
              <input
                ref={wavFileInputRef}
                type="file"
                accept=".wav,audio/wav,audio/wave,audio/x-wav"
                hidden
                onChange={(event) => {
                  void handleWavFileChange(event);
                }}
              />
              <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Edit Wavetable Config
                  </Button>
                </DialogTrigger>

                <DialogContent
                  maxW={{ base: "calc(100vw - 2rem)", sm: "xl" }}
                  p="0"
                  gap="0"
                  bg="surfaceBg"
                  borderColor="border"
                >
                  <Flex
                    align="center"
                    gap="3"
                    p="6"
                    borderBottomWidth="1px"
                    borderColor="border"
                    bg="bg.muted"
                    roundedTop="lg"
                  >
                    <Flex
                      w="8"
                      h="8"
                      rounded="lg"
                      align="center"
                      justify="center"
                      boxShadow="sm"
                      bgGradient="linear(to-br, indigo.500, purple.600)"
                    >
                      <Icon as={Waves} boxSize="4" color="white" />
                    </Flex>
                    <Box flex="1">
                      <DialogTitle>
                        {modalView === "list"
                          ? "Wavetable Tables"
                          : "Edit Wavetable Table"}
                      </DialogTitle>
                      <DialogDescription>
                        {modalView === "list"
                          ? "Add, edit, or delete tables in the wavetable bank."
                          : "Edit a single table using real/imag coefficient arrays."}
                      </DialogDescription>
                    </Box>
                  </Flex>

                  {modalView === "list" ? (
                    <>
                      <Flex
                        p="4"
                        borderBottomWidth="1px"
                        borderColor="border"
                        bg="bg.muted"
                      >
                        <Flex align="center" justify="space-between" w="full">
                          <Text
                            fontSize="xs"
                            color="fg.muted"
                            fontFamily="mono"
                          >
                            tables[{safeTables.length}]
                          </Text>
                          <Button
                            size="sm"
                            variant="outline"
                            gap="1"
                            onClick={addTable}
                          >
                            <Icon as={Plus} boxSize="3.5" />
                            Add New
                          </Button>
                        </Flex>
                      </Flex>

                      <VStack
                        align="stretch"
                        gap="2"
                        p="3"
                        bg="bg.canvas"
                        maxH="24rem"
                        overflowY="auto"
                      >
                        {safeTables.map((table, index) => (
                          <Flex
                            key={`wavetable-table-${index}`}
                            align="center"
                            justify="space-between"
                            rounded="md"
                            borderWidth="1px"
                            borderColor="border"
                            bg="surfaceBg"
                            px="3"
                            py="2"
                          >
                            <Box minW="0">
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                color="fg"
                              >
                                Table {index + 1}
                              </Text>
                              <Text
                                fontSize="xs"
                                color="fg.muted"
                                fontFamily="mono"
                                overflow="hidden"
                                textOverflow="ellipsis"
                                whiteSpace="nowrap"
                              >
                                real[{table.real.length}] • imag[
                                {table.imag.length}]
                              </Text>
                            </Box>
                            <HStack align="center" gap="1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                minW="2rem"
                                h="2rem"
                                onClick={() => {
                                  openEditTable(index);
                                }}
                              >
                                <Icon as={Edit2} boxSize="4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                color="red.500"
                                _hover={{ color: "red.600" }}
                                minW="2rem"
                                h="2rem"
                                onClick={() => {
                                  removeTable(index);
                                }}
                                disabled={safeTables.length <= 1}
                              >
                                <Icon as={Trash2} boxSize="4" />
                              </Button>
                            </HStack>
                          </Flex>
                        ))}
                      </VStack>

                      <Flex
                        p="4"
                        borderTopWidth="1px"
                        borderColor="border"
                        bg="bg.muted"
                        roundedBottom="lg"
                      >
                        <Flex
                          align="center"
                          justify="flex-end"
                          gap="2"
                          w="full"
                        >
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setIsModalOpen(false);
                            }}
                          >
                            Close
                          </Button>
                        </Flex>
                      </Flex>
                    </>
                  ) : (
                    <>
                      <Flex
                        p="4"
                        borderBottomWidth="1px"
                        borderColor="border"
                        bg="bg.muted"
                      >
                        <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                          table {(editingTableIndex ?? 0) + 1}/
                          {safeTables.length}
                          {" • format: { real: [...], imag: [...] }"}
                        </Text>
                      </Flex>

                      <Flex p="4" direction="column" gap="3" bg="bg.canvas">
                        <Textarea
                          rows={20}
                          value={editorValue}
                          onChange={(event) => {
                            setEditorValue(event.target.value);
                            if (editorError) setEditorError(null);
                          }}
                          minH="20rem"
                          resize="vertical"
                          rounded="md"
                          borderColor="border"
                          bg="surfaceBg"
                          p="3"
                          fontSize="xs"
                          color="fg"
                          fontFamily="mono"
                          spellCheck={false}
                        />

                        {editorError ? (
                          <Text fontSize="sm" color="red.500">
                            {editorError}
                          </Text>
                        ) : null}
                      </Flex>

                      <Flex
                        p="4"
                        borderTopWidth="1px"
                        borderColor="border"
                        bg="bg.muted"
                        roundedBottom="lg"
                      >
                        <Flex
                          align="center"
                          justify="flex-end"
                          gap="2"
                          w="full"
                        >
                          <Button variant="ghost" onClick={backToList}>
                            Back
                          </Button>
                          <Button onClick={applyEditedTable}>Save</Button>
                        </Flex>
                      </Flex>
                    </>
                  )}
                </DialogContent>
              </Dialog>
              <Button
                size="sm"
                variant="outline"
                gap="1"
                onClick={triggerImportWav}
                disabled={isImportingWav}
              >
                <Icon as={Upload} boxSize="3.5" />
                {isImportingWav ? "Importing..." : "Import WAV"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                gap="1"
                onClick={exportWav}
                disabled={isExportingWav}
              >
                <Icon as={Download} boxSize="3.5" />
                {isExportingWav ? "Exporting..." : "Export WAV"}
              </Button>
            </HStack>
          </Flex>

          {wavError ? (
            <Text fontSize="xs" color="red.500">
              {wavError}
            </Text>
          ) : null}

          <Flex
            direction="column"
            gap="2"
            p="3"
            rounded="md"
            borderWidth="1px"
            borderColor="border"
            bg="surfaceBg"
          >
            <Text fontSize="xs" fontWeight="semibold" color="fg">
              Preset
            </Text>
            <Select value={selectedPresetId} onValueChange={applyPreset}>
              <SelectTrigger>
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
          </Flex>

          <Flex direction="column" gap="2">
            <Flex direction={{ base: "column", sm: "row" }} gap="2">
              <Box
                flex="1"
                h="44"
                rounded="md"
                borderWidth="1px"
                borderColor="border"
                bg="bg.canvas"
                p="2"
                overflow="hidden"
              >
                <svg
                  width="100%"
                  height="100%"
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
              </Box>

              <Flex
                flexShrink={0}
                rounded="md"
                borderWidth="1px"
                borderColor="border"
                bg="bg.canvas"
                px={{ base: "1", sm: "0" }}
                w={{ base: "full", sm: "90px" }}
                align="center"
                justify="center"
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
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Flex>

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
    </Flex>
  );
};

export default Wavetable;
