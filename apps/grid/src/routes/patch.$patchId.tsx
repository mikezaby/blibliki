import { Button, Stack, Surface, Text } from "@blibliki/ui";
import { Link, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { normalizePatchViewMode } from "@/patch/viewMode";
import { loadById } from "@/patchSlice";
import { store } from "@/store";

const Grid = lazy(() => import("@/components/Grid"));

export const Route = createFileRoute("/patch/$patchId")({
  validateSearch: (search) => ({
    mode: search.mode === "runtime" ? "runtime" : undefined,
  }),
  loaderDeps: ({ search }) => ({
    viewMode: normalizePatchViewMode(search),
  }),
  loader: async ({ params, deps }) => {
    await store.dispatch(loadById(params.patchId, deps));
  },
  component: PatchPage,
});

export { normalizePatchViewMode };

function PatchPage() {
  const search = Route.useSearch();
  const mode = normalizePatchViewMode(search);

  if (mode === "runtime") {
    return <PatchRuntimeView />;
  }

  return (
    <Suspense fallback={null}>
      <Grid />
    </Suspense>
  );
}

function PatchRuntimeView() {
  const { patchId } = Route.useParams();

  return (
    <div className="p-6">
      <Surface tone="panel" border="subtle" className="mx-auto max-w-2xl p-6">
        <Stack gap={4}>
          <div>
            <Text asChild size="lg" weight="semibold">
              <h2>Runtime Mode</h2>
            </Text>
            <Text tone="muted">
              This patch is loaded without the React Flow editor so you can
              profile engine behavior with a lighter UI path.
            </Text>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="contained" color="neutral">
              <Link
                to="/patch/$patchId"
                params={{ patchId }}
                search={{ mode: undefined }}
              >
                Open editor
              </Link>
            </Button>
          </div>
        </Stack>
      </Surface>
    </div>
  );
}
