import { Resolution } from "@blibliki/engine";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Label,
  OptionSelect,
  Stack,
  Switch,
  Text,
} from "@blibliki/ui";
import { useId } from "react";
import type { MidiRecordingSettings } from "@/sequencer/recordingSettings";

export type ConsoleSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: MidiRecordingSettings;
  onChange: (settings: MidiRecordingSettings) => void;
};

const QUANTIZE_OPTIONS: {
  name: string;
  value: MidiRecordingSettings["quantize"];
}[] = [
  { name: "Off", value: "off" },
  { name: "1/32", value: Resolution.thirtysecond },
  { name: "1/16", value: Resolution.sixteenth },
  { name: "1/8", value: Resolution.eighth },
  { name: "1/4", value: Resolution.quarter },
];

const MODE_OPTIONS: { name: string; value: MidiRecordingSettings["mode"] }[] = [
  { name: "Loop until stopped", value: "loop" },
  { name: "One pass over the loop", value: "oneShot" },
];

function SettingRow({
  label,
  hint,
  control,
  controlId,
}: {
  label: string;
  hint: string;
  control: React.ReactNode;
  controlId: string;
}) {
  return (
    <Stack direction="row" align="center" justify="between" gap={4}>
      <Stack gap={1}>
        <Label htmlFor={controlId}>{label}</Label>
        <Text size="xs" tone="muted">
          {hint}
        </Text>
      </Stack>
      {control}
    </Stack>
  );
}

// The console's settings: one page for now, MIDI recording. More pages hang
// off the same list when they come.
export default function ConsoleSettings({
  open,
  onOpenChange,
  settings,
  onChange,
}: ConsoleSettingsProps) {
  const id = useId();
  const change = (patch: Partial<MidiRecordingSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-theme="dark" className="max-w-lg">
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription className="ui-visually-hidden">
          Console settings
        </DialogDescription>
        <nav aria-label="Settings pages">
          <Text
            asChild
            size="xs"
            className="font-mono uppercase tracking-[0.24em]"
          >
            <span aria-current="page">MIDI recording</span>
          </Text>
        </nav>
        <section aria-labelledby={`${id}-recording`}>
          <Text asChild weight="semibold">
            <h2 id={`${id}-recording`}>MIDI recording</h2>
          </Text>
          <Stack gap={4} className="mt-4">
            <SettingRow
              label="Metronome"
              hint="A click on every beat while the transport runs."
              controlId={`${id}-metronome`}
              control={
                <Switch
                  id={`${id}-metronome`}
                  checked={settings.metronome}
                  onCheckedChange={(metronome) => {
                    change({ metronome });
                  }}
                />
              }
            />
            <SettingRow
              label="Pre-count"
              hint="One bar of clicks before a recording starts the transport."
              controlId={`${id}-precount`}
              control={
                <Switch
                  id={`${id}-precount`}
                  checked={settings.precount}
                  onCheckedChange={(precount) => {
                    change({ precount });
                  }}
                />
              }
            />
            <SettingRow
              label="Quantize"
              hint="Notes snap to this grid. Off keeps their timing."
              controlId={`${id}-quantize`}
              control={
                <OptionSelect
                  label="Quantize"
                  value={settings.quantize}
                  options={QUANTIZE_OPTIONS}
                  onChange={(quantize: MidiRecordingSettings["quantize"]) => {
                    change({ quantize });
                  }}
                />
              }
            />
            <SettingRow
              label="Length"
              hint="How long a recording runs once armed."
              controlId={`${id}-mode`}
              control={
                <OptionSelect
                  label="Length"
                  value={settings.mode}
                  options={MODE_OPTIONS}
                  onChange={(mode: MidiRecordingSettings["mode"]) => {
                    change({ mode });
                  }}
                />
              }
            />
            <SettingRow
              label="Overdub"
              hint="Notes join what a step has. Off replaces it on the first note of a pass."
              controlId={`${id}-overdub`}
              control={
                <Switch
                  id={`${id}-overdub`}
                  checked={settings.overdub}
                  onCheckedChange={(overdub) => {
                    change({ overdub });
                  }}
                />
              }
            />
          </Stack>
        </section>
      </DialogContent>
    </Dialog>
  );
}
