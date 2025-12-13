import { createFileRoute } from "@tanstack/react-router";
import Devices from "@/components/Devices";

export const Route = createFileRoute("/devices")({
  component: DevicesPage,
});

function DevicesPage() {
  return <Devices />;
}
