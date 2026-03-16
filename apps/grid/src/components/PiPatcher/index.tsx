import { PiPatch } from "@blibliki/models";
import {
  compilePiPatcherDocument,
  createDefaultPiPatcherDocument,
  TRACK_PAGE_BLOCKS,
  withTrackEffectType,
  withTrackSourceProfile,
  type PiPatcherDocument,
  type SessionControlSpec,
  type SlotConfig,
} from "@blibliki/pi-patcher";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  OptionSelect,
  Stack,
  Surface,
  Switch,
  Text,
} from "@blibliki/ui";
import { useUser } from "@clerk/clerk-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type PiPatcherProps = {
  piPatchId: string;
};

type SaveState = "idle" | "loading" | "error";
const INACTIVE_EFFECT_OPTION = "__inactive__";

const SOURCE_PROFILE_OPTIONS = [
  { value: "unassigned", name: "Unassigned" },
  { value: "osc", name: "Osc" },
  { value: "3-osc", name: "3-Osc" },
  { value: "noise", name: "Noise" },
  { value: "wavetable", name: "Wavetable" },
] as const;

const EFFECT_OPTIONS = [
  { value: INACTIVE_EFFECT_OPTION, name: "Inactive" },
  { value: "reverb", name: "Reverb" },
  { value: "delay", name: "Delay" },
  { value: "chorus", name: "Chorus" },
  { value: "distortion", name: "Distortion" },
] as const;

const NOTE_SOURCE_OPTIONS = [
  { value: "stepSequencer", name: "Step Sequencer" },
  { value: "externalMidi", name: "External MIDI" },
] as const;

export default function PiPatcher({ piPatchId }: PiPatcherProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const [document, setDocument] = useState<PiPatcherDocument | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTrack, setActiveTrack] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [selectedSeqPage, setSelectedSeqPage] = useState(0);
  const [selectedStep, setSelectedStep] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoadError(null);
        if (piPatchId === "new") {
          if (!cancelled) setDocument(createDefaultPiPatcherDocument());
          return;
        }

        const patch = await PiPatch.find(piPatchId);
        if (!cancelled) setDocument(patch.document);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load Pi patch",
          );
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [piPatchId]);

  const compiled = useMemo(() => {
    if (!document) return null;

    try {
      return {
        result: compilePiPatcherDocument(document),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Compile failed",
      };
    }
  }, [document]);

  const track = document?.tracks[activeTrack];
  const pageBlocks = TRACK_PAGE_BLOCKS[activePage];

  const updateDocument = (
    updater: (current: PiPatcherDocument) => PiPatcherDocument,
  ) => {
    setDocument((current) => (current ? updater(current) : current));
  };

  const updateGlobalSlot = (
    slotIndex: number,
    initialValue: SlotConfig["initialValue"],
  ) => {
    updateDocument((current) => {
      const next = structuredClone(current);
      next.globalBlock.slots[slotIndex]!.initialValue = initialValue;
      return next;
    });
  };

  const updateTrackSlot = (
    blockId: keyof PiPatcherDocument["tracks"][number]["pages"],
    slotIndex: number,
    initialValue: SlotConfig["initialValue"],
  ) => {
    updateDocument((current) => {
      const next = structuredClone(current);
      next.tracks[activeTrack]!.pages[blockId][slotIndex]!.initialValue =
        initialValue;
      return next;
    });
  };

  const handleSave = async () => {
    if (!document || !user?.id) return;

    setSaveState("loading");
    setSaveError(null);

    try {
      const patch = new PiPatch({
        id: piPatchId === "new" ? undefined : piPatchId,
        name: document.name,
        userId: user.id,
        document,
      });
      await patch.save();
      setSaveState("idle");

      if (piPatchId === "new") {
        await navigate({
          to: "/pi-patch/$piPatchId",
          params: { piPatchId: patch.id },
        });
      }
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Failed to save");
    }
  };

  const handleDelete = async () => {
    if (piPatchId === "new") return;
    if (!confirm("Delete this Pi patch?")) return;

    try {
      const patch = await PiPatch.find(piPatchId);
      await patch.delete();
      await navigate({
        to: "/pi-patch/$piPatchId",
        params: { piPatchId: "new" },
      });
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  if (loadError) {
    return (
      <Surface tone="canvas" className="min-h-screen p-8">
        <Text tone="error">{loadError}</Text>
      </Surface>
    );
  }

  if (!document || !track || !pageBlocks) {
    return (
      <Surface tone="canvas" className="min-h-screen p-8">
        <Text tone="muted">Loading Pi patcher…</Text>
      </Surface>
    );
  }

  const [upperBlock, lowerBlock] = pageBlocks;
  const currentSeqPage = track.stepSequencer?.pages[selectedSeqPage];
  const currentStep = currentSeqPage?.steps[selectedStep];

  return (
    <Surface tone="canvas" className="min-h-screen overflow-auto p-6">
      <Stack gap={6} className="mx-auto max-w-7xl">
        <Stack direction="row" align="center" justify="between" gap={4}>
          <Stack gap={1}>
            <Text asChild weight="semibold" className="text-3xl">
              <h1>Pi Patcher</h1>
            </Text>
            <Text tone="muted">
              Prototype authoring surface for the Pi instrument document
            </Text>
          </Stack>

          <Stack direction="row" gap={2}>
            <Button asChild variant="text" color="neutral">
              <Link to="/patch/$patchId" params={{ patchId: "new" }}>
                Open Grid
              </Link>
            </Button>
            <Button
              color="info"
              onClick={() => {
                void handleSave();
              }}
              disabled={saveState === "loading" || Boolean(compiled?.error)}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            {piPatchId !== "new" && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  void handleDelete();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </Stack>
        </Stack>

        <Card>
          <CardHeader>
            <CardTitle>Document</CardTitle>
          </CardHeader>
          <CardContent>
            <Stack direction="row" gap={4} className="flex-wrap">
              <Stack gap={2} className="min-w-60">
                <Label>Name</Label>
                <Input
                  value={document.name}
                  onChange={(event) => {
                    updateDocument((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                  }}
                />
              </Stack>
              <Stack gap={2}>
                <Label>Template</Label>
                <Badge tone="info">{document.templateId}</Badge>
              </Stack>
              <Stack gap={2}>
                <Label>Hardware</Label>
                <Badge tone="secondary">{document.hardwareProfileId}</Badge>
              </Stack>
              <Stack gap={2}>
                <Label>Status</Label>
                {compiled?.error ? (
                  <Badge tone="error">Compile Error</Badge>
                ) : (
                  <Badge tone="success">Compiles</Badge>
                )}
              </Stack>
            </Stack>
            {compiled?.error && (
              <Text tone="error" className="mt-4 whitespace-pre-wrap">
                {compiled.error}
              </Text>
            )}
            {saveError && (
              <Text tone="error" className="mt-2">
                {saveError}
              </Text>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Globals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {document.globalBlock.slots.map((slot, index) => (
                <SlotEditor
                  key={slot.slotId}
                  slot={slot}
                  binding={compiled?.result?.bindings[slot.target ?? ""]}
                  onChange={(value) => {
                    updateGlobalSlot(index, value);
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Track Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <Stack gap={4}>
              <Stack direction="row" gap={2} className="flex-wrap">
                {document.tracks.map((_, index) => (
                  <Button
                    key={index}
                    size="sm"
                    color={index === activeTrack ? "info" : "neutral"}
                    variant={index === activeTrack ? "contained" : "outlined"}
                    onClick={() => {
                      setActiveTrack(index);
                    }}
                  >
                    Track {index + 1}
                  </Button>
                ))}
              </Stack>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                <Stack gap={2}>
                  <Label>Track Name</Label>
                  <Input
                    value={track.name ?? ""}
                    placeholder={`Track ${activeTrack + 1}`}
                    onChange={(event) => {
                      updateDocument((current) => {
                        const next = structuredClone(current);
                        next.tracks[activeTrack]!.name =
                          event.target.value || undefined;
                        return next;
                      });
                    }}
                  />
                </Stack>
                <Stack gap={2}>
                  <Label>Note Source</Label>
                  <OptionSelect
                    value={track.noteSource}
                    options={NOTE_SOURCE_OPTIONS}
                    onChange={(value) => {
                      updateDocument((current) => {
                        const next = structuredClone(current);
                        next.tracks[activeTrack]!.noteSource = value;
                        if (
                          value === "stepSequencer" &&
                          !next.tracks[activeTrack]!.stepSequencer
                        ) {
                          next.tracks[activeTrack]!.stepSequencer =
                            createDefaultPiPatcherDocument().tracks[0]!.stepSequencer;
                        }
                        return next;
                      });
                    }}
                  />
                </Stack>
                <Stack gap={2}>
                  <Label>MIDI Channel</Label>
                  <Input
                    type="number"
                    min={1}
                    max={16}
                    value={track.midiChannel}
                    onChange={(event) => {
                      updateDocument((current) => {
                        const next = structuredClone(current);
                        next.tracks[activeTrack]!.midiChannel = Number(
                          event.target.value,
                        );
                        return next;
                      });
                    }}
                  />
                </Stack>
                <Stack gap={2}>
                  <Label>Source Profile</Label>
                  <OptionSelect
                    value={track.sourceProfileId}
                    options={SOURCE_PROFILE_OPTIONS}
                    onChange={(value) => {
                      updateDocument((current) => {
                        const next = structuredClone(current);
                        next.tracks[activeTrack] = withTrackSourceProfile(
                          next.tracks[activeTrack]!,
                          value,
                        );
                        return next;
                      });
                    }}
                  />
                </Stack>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {track.effectSlots.map((effectSlot, effectIndex) => (
                  <Stack key={effectSlot.slotId} gap={2}>
                    <Label>FX Slot {effectIndex + 1}</Label>
                    <OptionSelect
                      value={effectSlot.effectType ?? INACTIVE_EFFECT_OPTION}
                      options={EFFECT_OPTIONS}
                      onChange={(value) => {
                        updateDocument((current) => {
                          const next = structuredClone(current);
                          next.tracks[activeTrack] = withTrackEffectType(
                            next.tracks[activeTrack]!,
                            effectIndex,
                            value === INACTIVE_EFFECT_OPTION ? null : value,
                          );
                          return next;
                        });
                      }}
                    />
                  </Stack>
                ))}
              </div>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focused Track Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <Stack gap={4}>
              <Stack direction="row" gap={2}>
                {["Src/Amp", "Flt/Mod", "FX A/B"].map((label, index) => (
                  <Button
                    key={label}
                    size="sm"
                    color={index === activePage ? "info" : "neutral"}
                    variant={index === activePage ? "contained" : "outlined"}
                    onClick={() => {
                      setActivePage(index);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </Stack>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <PageBlockEditor
                  title={upperBlock.toUpperCase()}
                  slots={track.pages[upperBlock]}
                  bindingResolver={(slot) =>
                    resolveTrackBinding(
                      compiled?.result?.bindings,
                      activeTrack,
                      slot,
                    )
                  }
                  onChange={(slotIndex, value) => {
                    updateTrackSlot(upperBlock, slotIndex, value);
                  }}
                />
                <PageBlockEditor
                  title={lowerBlock.toUpperCase()}
                  slots={track.pages[lowerBlock]}
                  bindingResolver={(slot) =>
                    resolveTrackBinding(
                      compiled?.result?.bindings,
                      activeTrack,
                      slot,
                    )
                  }
                  onChange={(slotIndex, value) => {
                    updateTrackSlot(lowerBlock, slotIndex, value);
                  }}
                />
              </div>
            </Stack>
          </CardContent>
        </Card>

        {track.noteSource === "stepSequencer" &&
          currentSeqPage &&
          currentStep && (
            <Card>
              <CardHeader>
                <CardTitle>Sequencer</CardTitle>
              </CardHeader>
              <CardContent>
                <Stack gap={4}>
                  <Stack direction="row" gap={2}>
                    {track.stepSequencer?.pages.map((page, index) => (
                      <Button
                        key={page.name}
                        size="sm"
                        color={index === selectedSeqPage ? "info" : "neutral"}
                        variant={
                          index === selectedSeqPage ? "contained" : "outlined"
                        }
                        onClick={() => {
                          setSelectedSeqPage(index);
                          setSelectedStep(0);
                        }}
                      >
                        {page.name}
                      </Button>
                    ))}
                  </Stack>

                  <div className="grid grid-cols-4 gap-2 md:grid-cols-8 xl:grid-cols-16">
                    {currentSeqPage.steps.map((step, index) => (
                      <Button
                        key={index}
                        size="sm"
                        color={
                          index === selectedStep
                            ? "info"
                            : step.active
                              ? "success"
                              : "neutral"
                        }
                        variant={
                          index === selectedStep ? "contained" : "outlined"
                        }
                        onClick={() => {
                          setSelectedStep(index);
                        }}
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <Stack gap={3}>
                      <Label>Step Settings</Label>
                      <Stack direction="row" align="center" gap={3}>
                        <Switch
                          checked={currentStep.active}
                          onCheckedChange={(checked) => {
                            updateDocument((current) => {
                              const next = structuredClone(current);
                              next.tracks[activeTrack]!.stepSequencer!.pages[
                                selectedSeqPage
                              ]!.steps[selectedStep]!.active = checked;
                              return next;
                            });
                          }}
                        />
                        <Text>{currentStep.active ? "Active" : "Muted"}</Text>
                      </Stack>
                      <Stack gap={2}>
                        <Label>Probability</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={currentStep.probability}
                          onChange={(event) => {
                            updateDocument((current) => {
                              const next = structuredClone(current);
                              next.tracks[activeTrack]!.stepSequencer!.pages[
                                selectedSeqPage
                              ]!.steps[selectedStep]!.probability = Number(
                                event.target.value,
                              );
                              return next;
                            });
                          }}
                        />
                      </Stack>
                      <Stack gap={2}>
                        <Label>Duration</Label>
                        <OptionSelect
                          value={currentStep.duration}
                          options={["1/16", "1/8", "1/4", "1/2", "1"]}
                          onChange={(value) => {
                            updateDocument((current) => {
                              const next = structuredClone(current);
                              next.tracks[activeTrack]!.stepSequencer!.pages[
                                selectedSeqPage
                              ]!.steps[selectedStep]!.duration = value;
                              return next;
                            });
                          }}
                        />
                      </Stack>
                      <Stack gap={2}>
                        <Label>Microtime</Label>
                        <Input
                          type="number"
                          min={-100}
                          max={100}
                          value={currentStep.microtimeOffset}
                          onChange={(event) => {
                            updateDocument((current) => {
                              const next = structuredClone(current);
                              next.tracks[activeTrack]!.stepSequencer!.pages[
                                selectedSeqPage
                              ]!.steps[selectedStep]!.microtimeOffset = Number(
                                event.target.value,
                              );
                              return next;
                            });
                          }}
                        />
                      </Stack>
                    </Stack>

                    <Stack gap={3}>
                      <Label>Notes</Label>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {currentStep.notes.map((note, noteIndex) => (
                          <Surface
                            key={noteIndex}
                            tone="panel"
                            border="subtle"
                            radius="md"
                            className="p-3"
                          >
                            <Stack gap={2}>
                              <Text size="sm" weight="medium">
                                Voice {noteIndex + 1}
                              </Text>
                              <Input
                                value={note.pitch ?? ""}
                                placeholder="C4"
                                onChange={(event) => {
                                  updateDocument((current) => {
                                    const next = structuredClone(current);
                                    next.tracks[
                                      activeTrack
                                    ]!.stepSequencer!.pages[
                                      selectedSeqPage
                                    ]!.steps[selectedStep]!.notes[
                                      noteIndex
                                    ]!.pitch = event.target.value || null;
                                    return next;
                                  });
                                }}
                              />
                              <Input
                                type="number"
                                min={1}
                                max={127}
                                value={note.velocity}
                                onChange={(event) => {
                                  updateDocument((current) => {
                                    const next = structuredClone(current);
                                    next.tracks[
                                      activeTrack
                                    ]!.stepSequencer!.pages[
                                      selectedSeqPage
                                    ]!.steps[selectedStep]!.notes[
                                      noteIndex
                                    ]!.velocity = Number(event.target.value);
                                    return next;
                                  });
                                }}
                              />
                            </Stack>
                          </Surface>
                        ))}
                      </div>
                    </Stack>
                  </div>
                </Stack>
              </CardContent>
            </Card>
          )}
      </Stack>
    </Surface>
  );
}

function resolveTrackBinding(
  bindings:
    | Record<
        string,
        ReturnType<typeof compilePiPatcherDocument>["bindings"][string]
      >
    | undefined,
  trackIndex: number,
  slot: SlotConfig,
) {
  if (!bindings || !slot.target) return undefined;

  if (slot.target.startsWith("global.")) {
    return bindings[slot.target];
  }

  const key = slot.target.replace(/^track\./, `track.${trackIndex}.`);
  return bindings[key];
}

function PageBlockEditor({
  title,
  slots,
  bindingResolver,
  onChange,
}: {
  title: string;
  slots: SlotConfig[];
  bindingResolver: (slot: SlotConfig) => ReturnType<typeof resolveTrackBinding>;
  onChange: (slotIndex: number, value: SlotConfig["initialValue"]) => void;
}) {
  return (
    <Stack gap={3}>
      <Text asChild weight="semibold">
        <h3>{title}</h3>
      </Text>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {slots.map((slot, slotIndex) => (
          <SlotEditor
            key={slot.slotId}
            slot={slot}
            binding={bindingResolver(slot)}
            onChange={(value) => {
              onChange(slotIndex, value);
            }}
          />
        ))}
      </div>
    </Stack>
  );
}

function SlotEditor({
  slot,
  binding,
  onChange,
}: {
  slot: SlotConfig;
  binding:
    | {
        control: SessionControlSpec;
      }
    | undefined;
  onChange: (value: SlotConfig["initialValue"]) => void;
}) {
  if (!slot.active) {
    return (
      <Surface
        tone="panel"
        border="subtle"
        radius="md"
        className="p-3 opacity-60"
      >
        <Stack gap={1}>
          <Text size="sm" weight="medium">
            {slot.displayLabel ?? slot.label}
          </Text>
          <Text tone="muted" size="sm">
            Inactive
          </Text>
        </Stack>
      </Surface>
    );
  }

  return (
    <Surface tone="panel" border="subtle" radius="md" className="p-3">
      <Stack gap={2}>
        <Label>{slot.label}</Label>
        <ControlInput
          slot={slot}
          control={binding?.control}
          onChange={onChange}
        />
      </Stack>
    </Surface>
  );
}

function ControlInput({
  slot,
  control,
  onChange,
}: {
  slot: SlotConfig;
  control: SessionControlSpec | undefined;
  onChange: (value: SlotConfig["initialValue"]) => void;
}) {
  if (!control) {
    return (
      <Input
        value={slot.initialValue?.toString() ?? ""}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    );
  }

  switch (control.kind) {
    case "enum":
      return (
        <OptionSelect
          value={
            (slot.initialValue as string | undefined) ?? control.options[0]
          }
          options={control.options.map((option) => ({
            name: option.toString(),
            value: option,
          }))}
          onChange={(value) => {
            onChange(value);
          }}
        />
      );
    case "boolean":
      return (
        <Stack direction="row" align="center" gap={3}>
          <Switch
            checked={Boolean(slot.initialValue)}
            onCheckedChange={(checked) => {
              onChange(checked);
            }}
          />
          <Text>{slot.initialValue ? "On" : "Off"}</Text>
        </Stack>
      );
    case "number":
      return (
        <Input
          type="number"
          min={control.min}
          max={control.max}
          step={control.step}
          value={slot.initialValue?.toString() ?? ""}
          onChange={(event) => {
            onChange(Number(event.target.value));
          }}
        />
      );
  }
}
