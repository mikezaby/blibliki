import { Instrument } from "@blibliki/models";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import InstrumentEditor from "@/components/Instruments/InstrumentEditor";
import {
  isInstrumentDebugPath,
  isInstrumentPerformancePath,
} from "./-instrumentRoutePath";

export const Route = createFileRoute("/instrument/$instrumentId")({
  loader: async ({ params }) => {
    const instrument = await Instrument.find(params.instrumentId);
    return instrument.serialize();
  },
  component: InstrumentEditorPage,
});

function InstrumentEditorPage() {
  const instrument = Route.useLoaderData();
  const location = useLocation();

  if (
    isInstrumentDebugPath(location.pathname, instrument.id) ||
    isInstrumentPerformancePath(location.pathname, instrument.id)
  ) {
    return <Outlet />;
  }

  return <InstrumentEditor instrument={instrument} />;
}
