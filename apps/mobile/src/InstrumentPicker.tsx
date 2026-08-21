import type { IInstrument } from "@blibliki/models";
import { Button, Surface, Text } from "@blibliki/ui";
import { Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { filterInstruments } from "./filterInstruments";

export type InstrumentPickerProps = {
  load: () => Promise<IInstrument[]>;
  onSelect: (instrument: IInstrument) => void;
};

type PickerState =
  | { status: "loading" }
  | { status: "ready"; instruments: IInstrument[] }
  | { status: "error"; message: string };

function trackCount(instrument: IInstrument) {
  const tracks = (instrument.document as { tracks?: unknown }).tracks;
  const count = Array.isArray(tracks) ? tracks.length : 0;

  return `${String(count)} ${count === 1 ? "track" : "tracks"}`;
}

export default function InstrumentPicker({
  load,
  onSelect,
}: InstrumentPickerProps) {
  const [state, setState] = useState<PickerState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const searchId = useId();

  useEffect(() => {
    // The signal, rather than a captured flag, is what tells a load that
    // finished after the screen went away to keep its result to itself.
    const controller = new AbortController();

    void (async () => {
      try {
        const instruments = await load();
        if (controller.signal.aborted) return;

        setState({
          status: "ready",
          instruments: [...instruments].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return () => {
      controller.abort();
    };
  }, [load]);

  const instruments =
    state.status === "ready" ? filterInstruments(state.instruments, query) : [];

  return (
    <Surface
      tone="canvas"
      data-theme="dark"
      className="fixed inset-0 overflow-y-auto bg-zinc-950 px-5 py-6"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <Text
          asChild
          weight="semibold"
          className="block font-mono text-lg uppercase tracking-[0.22em] text-zinc-300"
        >
          <h1>Choose an instrument</h1>
        </Text>

        <div className="flex items-center gap-3 rounded-2xl bg-zinc-900/60 px-4">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <label className="sr-only" htmlFor={searchId}>
            Filter instruments
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            autoComplete="off"
            placeholder="Filter by name"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            className="w-full bg-transparent py-3 font-mono text-base text-zinc-100 outline-none placeholder:text-zinc-600"
          />
        </div>

        {state.status === "loading" ? (
          <Text className="font-mono text-sm uppercase tracking-[0.14em] text-zinc-500">
            Loading instruments…
          </Text>
        ) : null}

        {state.status === "error" ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-4">
            <Text className="font-mono text-sm uppercase tracking-[0.12em] text-red-100">
              {state.message}
            </Text>
          </div>
        ) : null}

        {state.status === "ready" && instruments.length === 0 ? (
          <Text className="font-mono text-sm uppercase tracking-[0.14em] text-zinc-500">
            {query
              ? "Nothing matches that name."
              : "No instruments stored yet."}
          </Text>
        ) : null}

        <ul className="flex flex-col gap-2">
          {instruments.map((instrument) => (
            <li key={instrument.id}>
              <Button
                variant="text"
                color="neutral"
                onClick={() => {
                  onSelect(instrument);
                }}
                className="h-auto w-full justify-between rounded-2xl bg-zinc-900/40 px-4 py-4 text-left hover:bg-zinc-900"
              >
                <span className="font-mono text-base text-zinc-100">
                  {instrument.name}
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
                  {trackCount(instrument)}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
}
