import { createFileRoute } from "@tanstack/react-router";
import Instruments from "@/components/Instruments";

export const Route = createFileRoute("/instruments")({
  component: InstrumentsPage,
});

function InstrumentsPage() {
  return <Instruments />;
}
