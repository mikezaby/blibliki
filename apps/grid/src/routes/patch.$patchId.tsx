import { createFileRoute } from "@tanstack/react-router";
import Grid from "@/components/Grid";
import { loadById } from "@/patchSlice";
import { store } from "@/store";

export const Route = createFileRoute("/patch/$patchId")({
  loader: async ({ params }) => {
    await store.dispatch(loadById(params.patchId));
  },
  component: PatchPage,
});

function PatchPage() {
  return <Grid />;
}
