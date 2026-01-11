import {
  type MidiMapping,
  MidiMappingMode,
  ModuleType,
  moduleSchemas,
} from "@blibliki/engine";
import { ChevronDown, ChevronUp, SquarePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Select from "@/components/Select";
import { useAppSelector, useAppDispatch } from "@/hooks";
import { ModuleComponent } from ".";
import { Button, Input, Label } from "../ui";
import Container from "./Container";
import { initialize } from "./MidiInput/midiDevicesSlice";
import { modulesSelector } from "./modulesSlice";

const MidiMapper: ModuleComponent<ModuleType.MidiMapper> = (props) => {
  const {
    updateProp,
    props: { pages, activePage, globalMappings = [] },
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
    <Container className="flex flex-col gap-6">
      {/* Page Navigation */}
      <div className="flex flex-col gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Page Navigation
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {activePage + 1} / {pages.length}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={activePage === 0}
            onClick={() => {
              onSwitchPage(activePage - 1);
            }}
            className="flex-1"
          >
            {"← Previous"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={activePage === pages.length - 1}
            onClick={() => {
              onSwitchPage(activePage + 1);
            }}
            className="flex-1"
          >
            {"Next →"}
          </Button>
          <Button
            size="sm"
            onClick={onAddPage}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-md"
          >
            <SquarePlus className="w-4 h-4" />
            New Page
          </Button>
        </div>
      </div>

      {/* Page Settings */}
      <div className="flex flex-col gap-3 p-4 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Page Settings
        </h3>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Label className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-fit">
              Page Name
            </Label>
            <Input
              className="flex-1 bg-white dark:bg-slate-950/50"
              value={page?.name ?? `Page ${activePage}`}
              onChange={(e) => {
                onUpdatePageName(activePage, e.currentTarget.value);
              }}
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={pages.length <= 1}
            onClick={() => {
              onRemovePage(activePage);
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex flex-col gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Mapping Scope
        </h3>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "page" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("page");
            }}
            className="flex-1"
          >
            Page Mappings
          </Button>
          <Button
            variant={viewMode === "global" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("global");
            }}
            className="flex-1"
          >
            Global Mappings
          </Button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {viewMode === "page"
            ? "These mappings apply only to the current page"
            : "These mappings are available on all pages"}
        </p>
      </div>

      {/* MIDI Mappings */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {viewMode === "global" ? "Global " : "Page "}MIDI Mappings
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {mappings.length} {mappings.length === 1 ? "mapping" : "mappings"}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {mappings.map((mapping, i) => {
            const isExpanded = expandedMappings.has(i);
            const mode = mapping.mode ?? "direct";

            return (
              <div
                key={`${viewMode}-${activePage}-${i}`}
                className="flex flex-col gap-3 p-3 rounded-lg bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
              >
                {/* Main mapping row */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-fit">
                      CC
                    </Label>
                    <Input
                      className="w-24 text-center bg-slate-50 dark:bg-slate-950/50 font-mono"
                      type="string"
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
                    <Select
                      label="Select module"
                      value={mapping.moduleId ?? ""}
                      options={modules}
                      onChange={(value: string) => {
                        updateMappedModuleId({ id: value, index: i });
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-1">
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
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      toggleExpanded(i);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onRemoveMapping(i);
                    }}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Advanced settings (expandable) */}
                {isExpanded && (
                  <div className="flex flex-col gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
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
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
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
                    </div>

                    {(mode === MidiMappingMode.incDec ||
                      mode === MidiMappingMode.incDecRev) && (
                      <>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
                            Threshold
                          </Label>
                          <Input
                            className="w-24 text-center bg-slate-50 dark:bg-slate-950/50"
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
                          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                            Value &gt; threshold increments, ≤ threshold
                            decrements
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
                            Step
                          </Label>
                          <Input
                            className="w-24 text-center bg-slate-50 dark:bg-slate-950/50"
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
                          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                            Amount to increment/decrement (leave empty for auto)
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Button
        onClick={onAdd}
        variant="outline"
        className="w-full border-dashed border-2 hover:border-solid hover:bg-slate-50 dark:hover:bg-slate-900/50"
      >
        <SquarePlus className="w-4 h-4" />
        Add New Mapping
      </Button>
    </Container>
  );
};

export default MidiMapper;
