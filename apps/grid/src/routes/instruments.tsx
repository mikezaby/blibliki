import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/instruments")({
  component: InstrumentsLayout,
});

function InstrumentsLayout() {
  return <Outlet />;
}
