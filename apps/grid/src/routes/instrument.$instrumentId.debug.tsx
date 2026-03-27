import { createFileRoute } from "@tanstack/react-router";
import Grid from "@/components/Grid";
import InstrumentDebugAutoLayout from "@/instruments/InstrumentDebugAutoLayout";
import { loadInstrumentDebugById } from "@/patchSlice";
import { store } from "@/store";

export const Route = createFileRoute("/instrument/$instrumentId/debug")({
  loader: async ({ params }) => {
    await store.dispatch(loadInstrumentDebugById(params.instrumentId));
  },
  component: InstrumentDebugGridPage,
});

function InstrumentDebugGridPage() {
  return (
    <Grid>
      <InstrumentDebugAutoLayout />
    </Grid>
  );
}
