import {
  type MidiMapping,
  MidiMappingMode,
  ModuleType,
  moduleSchemas,
} from "@blibliki/engine";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { ChevronDown, ChevronUp, SquarePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Select from "@/components/Select";
import { useAppSelector, useAppDispatch } from "@/hooks";
import { Button, Input, Label } from "@/ui-system/components";
import { ModuleComponent } from ".";
import { initialize } from "./MidiInput/midiDevicesSlice";
import { modulesSelector } from "./modulesSlice";

const MidiMapper: ModuleComponent<ModuleType.MidiMapper> = (props) => {
  const {
    updateProp,
    props: { pages, activePage, globalMappings },
  } = props;

  const dispatch = useAppDispatch();
  const modules = useAppSelector((state) => modulesSelector.selectAll(state));

  const page = pages[activePage];
  const pageMappings = page?.mappings ?? [{}];

  // Track whether we're viewing global or page-specific mappings
  const [viewMode, setViewMode] = useState<"page" | "global">("page");

  // Get the active mappings based on view mode
  const mappings = viewMode === "global" ? globalMappings : pageMappings;

  // Track which mappings have expanded settings
  const [expandedMappings, setExpandedMappings] = useState<Set<number>>(
    new Set(),
  );
  const [lastViewMode, setLastViewMode] = useState(viewMode);

  // Reset expanded mappings during render when viewMode changes
  // This avoids calling setState in an effect which can cause cascading renders
  if (viewMode !== lastViewMode) {
    setExpandedMappings(new Set());
    setLastViewMode(viewMode);
  }

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

  const onAddPage = () => {
    const newPages = [
      ...pages,
      { name: `Page ${pages.length + 1}`, mappings: [{}] },
    ];
    updateProp("pages")(newPages);
  };

  const onRemovePage = (pageIndex: number) => {
    if (pages.length <= 1) return; // Keep at least one page

    const newPages = pages.filter((_, index) => index !== pageIndex);
    const newActivePage =
      activePage >= newPages.length ? newPages.length - 1 : activePage;

    updateProp("pages")(newPages);
    updateProp("activePage")(newActivePage);
  };

  const onUpdatePageName = (pageIndex: number, name: string) => {
    const newPages = pages.map((page, index) =>
      index === pageIndex ? { ...page, name } : page,
    );
    updateProp("pages")(newPages);
  };

  const onSwitchPage = (pageIndex: number) => {
    updateProp("activePage")(pageIndex);
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
      const newPages = pages.map((page, index) =>
        index === activePage ? { ...page, mappings: updatedMappings } : page,
      );
      updateProp("pages")(newPages);
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
    <Flex direction="column" gap="6">
      <Flex
        direction="column"
        gap="3"
        p="4"
        rounded="lg"
        bg="bg.muted"
        borderWidth="1px"
        borderColor="border"
      >
        <Flex align="center" justify="space-between">
          <Text fontSize="sm" fontWeight="semibold">
            Page Navigation
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {activePage + 1} / {pages.length}
          </Text>
        </Flex>

        <Flex gap="2">
          <Button
            variant="outline"
            size="sm"
            flex="1"
            disabled={activePage === 0}
            onClick={() => {
              onSwitchPage(activePage - 1);
            }}
          >
            {"← Previous"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            flex="1"
            disabled={activePage === pages.length - 1}
            onClick={() => {
              onSwitchPage(activePage + 1);
            }}
          >
            {"Next →"}
          </Button>
          <Button
            size="sm"
            color="white"
            bgGradient="linear(to-r, cyan.500, blue.500)"
            _hover={{ bgGradient: "linear(to-r, cyan.600, blue.600)" }}
            boxShadow="md"
            onClick={onAddPage}
          >
            <SquarePlus size={16} />
            New Page
          </Button>
        </Flex>
      </Flex>

      <Flex
        direction="column"
        gap="3"
        p="4"
        rounded="lg"
        bgGradient="linear(to-br, gray.50, gray.100)"
        _dark={{ bgGradient: "linear(to-br, gray.900, gray.800)" }}
        borderWidth="1px"
        borderColor="border"
        boxShadow="sm"
      >
        <Text fontSize="sm" fontWeight="semibold">
          Page Settings
        </Text>

        <Flex align="center" gap="4">
          <HStack gap="2" flex="1">
            <Label
              fontSize="sm"
              fontWeight="medium"
              color="fg.muted"
              minW="fit-content"
            >
              Page Name
            </Label>
            <Input
              flex="1"
              bg="surfaceBg"
              value={page?.name ?? `Page ${activePage}`}
              onChange={(event) => {
                onUpdatePageName(activePage, event.currentTarget.value);
              }}
            />
          </HStack>
          <Button
            variant="destructive"
            size="sm"
            disabled={pages.length <= 1}
            onClick={() => {
              onRemovePage(activePage);
            }}
          >
            <Trash2 size={16} />
            Delete
          </Button>
        </Flex>
      </Flex>

      <Flex
        direction="column"
        gap="3"
        p="4"
        rounded="lg"
        bg="bg.muted"
        borderWidth="1px"
        borderColor="border"
      >
        <Text fontSize="sm" fontWeight="semibold">
          Mapping Scope
        </Text>
        <Flex gap="2">
          <Button
            variant={viewMode === "page" ? "default" : "outline"}
            size="sm"
            flex="1"
            onClick={() => {
              setViewMode("page");
            }}
          >
            Page Mappings
          </Button>
          <Button
            variant={viewMode === "global" ? "default" : "outline"}
            size="sm"
            flex="1"
            onClick={() => {
              setViewMode("global");
            }}
          >
            Global Mappings
          </Button>
        </Flex>
        <Text fontSize="xs" color="fg.muted">
          {viewMode === "page"
            ? "These mappings apply only to the current page"
            : "These mappings are available on all pages"}
        </Text>
      </Flex>

      <Flex direction="column" gap="4">
        <Flex align="center" justify="space-between" px="1">
          <Text fontSize="sm" fontWeight="semibold">
            {viewMode === "global" ? "Global " : "Page "}MIDI Mappings
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {mappings.length} {mappings.length === 1 ? "mapping" : "mappings"}
          </Text>
        </Flex>

        <Flex direction="column" gap="3">
          {mappings.map((mapping, i) => {
            const isExpanded = expandedMappings.has(i);
            const mode = mapping.mode ?? "direct";

            return (
              <Flex
                key={`${viewMode}-${activePage}-${i}`}
                direction="column"
                gap="3"
                p="3"
                rounded="lg"
                bg="surfaceBg"
                borderWidth="1px"
                borderColor="border"
                _hover={{ borderColor: "gray.300" }}
                boxShadow="sm"
              >
                <Flex
                  align="center"
                  gap="3"
                  wrap={{ base: "wrap", xl: "nowrap" }}
                >
                  <HStack gap="2">
                    <Label
                      fontSize="xs"
                      fontWeight="medium"
                      color="fg.muted"
                      minW="fit-content"
                    >
                      CC
                    </Label>
                    <Input
                      w="24"
                      textAlign="center"
                      bg="bg.muted"
                      fontFamily="mono"
                      type="text"
                      value={mapping.autoAssign ? "Mapping..." : mapping.cc}
                      placeholder="Unmapped"
                      readOnly
                      onClick={() => {
                        updateMappedAutoAssign({ index: i });
                      }}
                      onChange={(event) => {
                        updateMappedCC({
                          cc: Number(event.currentTarget.value),
                          index: i,
                        });
                      }}
                    />
                  </HStack>

                  <Box flex="1">
                    <Select
                      label="Select module"
                      value={mapping.moduleId ?? ""}
                      options={modules}
                      onChange={(value: string) => {
                        updateMappedModuleId({ id: value, index: i });
                      }}
                    />
                  </Box>

                  <Box flex="1">
                    <Select
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
                  </Box>

                  <Button
                    variant="ghost"
                    size="sm"
                    color="fg.muted"
                    _hover={{ color: "fg" }}
                    onClick={() => {
                      toggleExpanded(i);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    color="fg.muted"
                    _hover={{ color: "red.500", bg: "red.50" }}
                    _dark={{ _hover: { bg: "red.950" } }}
                    onClick={() => {
                      onRemoveMapping(i);
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </Flex>

                {isExpanded && (
                  <Flex
                    direction="column"
                    gap="3"
                    pt="3"
                    borderTopWidth="1px"
                    borderColor="border"
                  >
                    <Flex align="center" gap="2" wrap="wrap">
                      <Label
                        fontSize="xs"
                        fontWeight="medium"
                        color="fg.muted"
                        minW="80px"
                      >
                        Mode
                      </Label>
                      <Select
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
                      <Text fontSize="xs" color="fg.muted" ml="2">
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
                      </Text>
                    </Flex>

                    {(mode === MidiMappingMode.incDec ||
                      mode === MidiMappingMode.incDecRev) && (
                      <>
                        <Flex align="center" gap="2" wrap="wrap">
                          <Label
                            fontSize="xs"
                            fontWeight="medium"
                            color="fg.muted"
                            minW="80px"
                          >
                            Threshold
                          </Label>
                          <Input
                            w="24"
                            textAlign="center"
                            bg="bg.muted"
                            type="number"
                            min={0}
                            max={127}
                            value={mapping.threshold ?? 64}
                            onChange={(event) => {
                              updateMappedThreshold({
                                threshold: Number(event.currentTarget.value),
                                index: i,
                              });
                            }}
                          />
                          <Text fontSize="xs" color="fg.muted" ml="2">
                            Value &gt; threshold increments, ≤ threshold
                            decrements
                          </Text>
                        </Flex>

                        <Flex align="center" gap="2" wrap="wrap">
                          <Label
                            fontSize="xs"
                            fontWeight="medium"
                            color="fg.muted"
                            minW="80px"
                          >
                            Step
                          </Label>
                          <Input
                            w="24"
                            textAlign="center"
                            bg="bg.muted"
                            type="number"
                            step="any"
                            value={mapping.step ?? ""}
                            placeholder="Auto"
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              if (value === "") {
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
                          <Text fontSize="xs" color="fg.muted" ml="2">
                            Amount to increment/decrement (leave empty for auto)
                          </Text>
                        </Flex>
                      </>
                    )}
                  </Flex>
                )}
              </Flex>
            );
          })}
        </Flex>
      </Flex>

      <Button
        onClick={onAdd}
        variant="outline"
        w="full"
        borderStyle="dashed"
        borderWidth="2px"
        _hover={{ borderStyle: "solid", bg: "bg.muted" }}
      >
        <SquarePlus size={16} />
        Add New Mapping
      </Button>
    </Flex>
  );
};

export default MidiMapper;
