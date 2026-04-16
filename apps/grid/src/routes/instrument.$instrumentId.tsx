import { Instrument } from "@blibliki/models";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import InstrumentEditor from "@/components/Instruments/InstrumentEditor";
import InstrumentPerformance from "@/components/Instruments/InstrumentPerformance";

type InstrumentViewMode = "editor" | "performance";

type InstrumentViewModeSearch = {
  mode?: unknown;
};

export const Route = createFileRoute("/instrument/$instrumentId")({
  validateSearch: (search) => ({
    mode: search.mode === "performance" ? "performance" : undefined,
  }),
  loader: async ({ params }) => {
    const instrument = await Instrument.find(params.instrumentId);
    return instrument.serialize();
  },
  component: InstrumentEditorPage,
});

export function normalizeInstrumentViewMode(
  search: InstrumentViewModeSearch,
): InstrumentViewMode {
  return search.mode === "performance" ? "performance" : "editor";
}

function InstrumentEditorPage() {
  const loadedInstrument = Route.useLoaderData();
  const [instrument, setInstrument] = useState(loadedInstrument);
  const location = useLocation();
  const search = Route.useSearch();

  if (isInstrumentDebugPath(location.pathname, instrument.id)) {
    return <Outlet />;
  }

  if (normalizeInstrumentViewMode(search) === "performance") {
    return (
      <InstrumentPerformance
        instrument={instrument}
        onInstrumentChange={setInstrument}
      />
    );
  }

  return <InstrumentEditor instrument={instrument} />;
}

export function isInstrumentDebugPath(pathname: string, instrumentId: string) {
  return pathname === `/instrument/${instrumentId}/debug`;
}
