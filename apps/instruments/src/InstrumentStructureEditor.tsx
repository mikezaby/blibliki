import {
  isMasterTrackDocument,
  selectTrackAudioSource,
  updateTrackDocument,
  updateTrackFxChain,
  type EffectProfileId,
  type InstrumentDocument,
  type InstrumentTrackDocument,
  type SourceProfileId,
} from "@blibliki/instrument";
import {
  Button,
  Input,
  Label,
  OptionSelect,
  Stack,
  Switch,
  cn,
} from "@blibliki/ui";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import {
  EFFECT_LABELS,
  SOURCE_LABELS,
  summarizeTrack,
  trackLabel,
} from "./structureLabels";

export type InstrumentStructureEditorProps = {
  document: InstrumentDocument;
  onChange: (document: InstrumentDocument) => void;
};

const INTERNAL_AUDIO = "internal";
const VOICES_MIN = 1;
const VOICES_MAX = 64;
const DEFAULT_VOICES = 8;
const FX_SLOTS = [0, 1, 2, 3] as const;

const SOURCE_OPTIONS = Object.entries(SOURCE_LABELS).map(([value, name]) => ({
  name,
  value,
}));
const EFFECT_OPTIONS = Object.entries(EFFECT_LABELS).map(([value, name]) => ({
  name,
  value,
}));
const MIDI_CHANNEL_OPTIONS = Array.from(
  { length: 16 },
  (_, index) => index + 1,
);
const ROUTING_MODE_OPTIONS = [
  { name: "Parallel, the other track is still heard", value: "parallel" },
  { name: "Serial, only heard through this track", value: "serial" },
];

type TrackRowProps = InstrumentStructureEditorProps & {
  trackIndex: number;
  track: InstrumentTrackDocument;
  open: boolean;
  onToggle: () => void;
};

function TrackRow({
  document,
  onChange,
  trackIndex,
  track,
  open,
  onToggle,
}: TrackRowProps) {
  const panelId = useId();
  const nameId = useId();
  const voicesId = useId();
  const sequencerId = useId();
  const isMaster = isMasterTrackDocument(track);
  const enabled = track.enabled !== false;
  const audioSource = track.audioSource ?? { type: INTERNAL_AUDIO };
  const isFed = audioSource.type === "track";
  const label = trackLabel(document, trackIndex);

  const change = (changes: Partial<InstrumentTrackDocument>) => {
    onChange(updateTrackDocument(document, trackIndex, changes));
  };

  // A track can be fed by any other note track. Feeding it from itself or
  // from the master, which already receives every track, would loop.
  const feederOptions = [
    { name: "Its own sound source", value: INTERNAL_AUDIO },
    ...document.tracks.flatMap((candidate, candidateIndex) =>
      candidate.key === track.key || isMasterTrackDocument(candidate)
        ? []
        : [
            {
              name: trackLabel(document, candidateIndex),
              value: candidate.key,
            },
          ],
    ),
  ];

  return (
    <div className={cn("rounded-2xl bg-zinc-900/40", !enabled && "opacity-60")}>
      <div className="flex items-center gap-3 pr-4">
        <Button
          variant="text"
          color="neutral"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-2xl px-4 py-4 text-left"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "h-4 w-4 shrink-0 text-zinc-500 transition-transform",
              open && "rotate-180",
            )}
          />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-mono text-base text-zinc-100">{label}</span>
            <span className="font-mono text-xs uppercase leading-4 tracking-[0.12em] text-zinc-500">
              {summarizeTrack(document, trackIndex)}
            </span>
          </span>
        </Button>
        {isMaster ? null : (
          <Switch
            checked={enabled}
            aria-label={`${label} on`}
            onCheckedChange={(checked) => {
              change({ enabled: checked });
            }}
          />
        )}
      </div>

      {open ? (
        <Stack
          id={panelId}
          gap={4}
          className="border-t border-zinc-800 px-4 py-4"
        >
          {isMaster ? null : (
            <Stack gap={2}>
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                value={track.name ?? ""}
                placeholder={label}
                autoComplete="off"
                onChange={(event) => {
                  change({ name: event.target.value });
                }}
              />
            </Stack>
          )}

          {isMaster || isFed ? null : (
            <Stack gap={2}>
              <Label>Sound source</Label>
              <OptionSelect
                label="Select sound source"
                value={track.sourceProfileId}
                options={SOURCE_OPTIONS}
                triggerClassName="w-full"
                onChange={(sourceProfileId: SourceProfileId) => {
                  change({ sourceProfileId });
                }}
              />
            </Stack>
          )}

          {isMaster ? null : (
            <Stack direction="row" align="center" justify="between" gap={3}>
              <Label htmlFor={sequencerId}>Step sequencer</Label>
              <Switch
                id={sequencerId}
                checked={track.noteSource === "stepSequencer"}
                onCheckedChange={(checked) => {
                  change({
                    noteSource: checked ? "stepSequencer" : "externalMidi",
                  });
                }}
              />
            </Stack>
          )}

          <Stack gap={2}>
            <Label>Effects, in signal order</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FX_SLOTS.map((fxIndex) => (
                <OptionSelect
                  key={fxIndex}
                  label={`Effect ${String(fxIndex + 1)}`}
                  value={track.fxChain[fxIndex]}
                  options={EFFECT_OPTIONS}
                  triggerClassName="w-full"
                  onChange={(effect: EffectProfileId) => {
                    onChange(
                      updateTrackFxChain(document, trackIndex, fxIndex, effect),
                    );
                  }}
                />
              ))}
            </div>
          </Stack>

          {isMaster ? null : (
            <details>
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.14em] text-zinc-400">
                Advanced
              </summary>
              <Stack gap={4} className="pt-4">
                <Stack gap={2}>
                  <Label>Fed from</Label>
                  <OptionSelect
                    label="Select where the audio comes from"
                    value={isFed ? audioSource.trackKey : INTERNAL_AUDIO}
                    options={feederOptions}
                    triggerClassName="w-full"
                    onChange={(value: string) => {
                      onChange(
                        selectTrackAudioSource(
                          document,
                          trackIndex,
                          value === INTERNAL_AUDIO ? undefined : value,
                        ),
                      );
                    }}
                  />
                </Stack>

                {isFed ? (
                  <Stack gap={2}>
                    <Label>Routing</Label>
                    <OptionSelect
                      label="Select routing"
                      value={audioSource.mode}
                      options={ROUTING_MODE_OPTIONS}
                      triggerClassName="w-full"
                      onChange={(mode: "parallel" | "serial") => {
                        change({ audioSource: { ...audioSource, mode } });
                      }}
                    />
                  </Stack>
                ) : (
                  <>
                    <Stack gap={2}>
                      <Label>MIDI channel</Label>
                      <OptionSelect
                        label="Select MIDI channel"
                        value={track.midiChannel}
                        options={MIDI_CHANNEL_OPTIONS}
                        triggerClassName="w-full"
                        onChange={(midiChannel: number) => {
                          change({ midiChannel });
                        }}
                      />
                    </Stack>
                    <Stack gap={2}>
                      <Label htmlFor={voicesId}>Voices</Label>
                      <Input
                        id={voicesId}
                        type="number"
                        inputMode="numeric"
                        min={VOICES_MIN}
                        max={VOICES_MAX}
                        value={track.voices ?? DEFAULT_VOICES}
                        onChange={(event) => {
                          const voices = event.target.valueAsNumber;
                          if (Number.isNaN(voices)) return;

                          change({
                            voices: Math.min(
                              VOICES_MAX,
                              Math.max(VOICES_MIN, Math.round(voices)),
                            ),
                          });
                        }}
                      />
                    </Stack>
                  </>
                )}
              </Stack>
            </details>
          )}
        </Stack>
      ) : null}
    </div>
  );
}

// Edits what an instrument is made of: which tracks are on, what each one is,
// its effects and its routing. It takes a document and hands back a document,
// so it can sit in the new-instrument wizard or on an existing instrument.
export default function InstrumentStructureEditor({
  document,
  onChange,
}: InstrumentStructureEditorProps) {
  const [openTrackKey, setOpenTrackKey] = useState<string>();

  return (
    <ul className="flex flex-col gap-2">
      {document.tracks.map((track, trackIndex) => (
        <li key={track.key}>
          <TrackRow
            document={document}
            onChange={onChange}
            trackIndex={trackIndex}
            track={track}
            open={openTrackKey === track.key}
            onToggle={() => {
              setOpenTrackKey(
                openTrackKey === track.key ? undefined : track.key,
              );
            }}
          />
        </li>
      ))}
    </ul>
  );
}
