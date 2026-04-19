import { createFileRoute } from "@tanstack/react-router";
import InstrumentPerformance from "@/components/Instruments/InstrumentPerformance";
import { Route as InstrumentRoute } from "./instrument.$instrumentId";

export const Route = createFileRoute("/instrument/$instrumentId/performance")({
  component: InstrumentPerformancePage,
});

function InstrumentPerformancePage() {
  const instrument = InstrumentRoute.useLoaderData();

  return <InstrumentPerformance instrument={instrument} />;
}
