import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { loadInstrumentDebugById } from "@/patchSlice";
import { store } from "@/store";

const InstrumentDebugGrid = lazy(
  () => import("@/instruments/InstrumentDebugGrid"),
);

export const Route = createFileRoute("/instrument/$instrumentId/debug")({
  loader: async ({ params }) => {
    await store.dispatch(loadInstrumentDebugById(params.instrumentId));
  },
  component: InstrumentDebugGridPage,
});

function InstrumentDebugGridPage() {
  return (
    <Suspense fallback={null}>
      <InstrumentDebugGrid />
    </Suspense>
  );
}
