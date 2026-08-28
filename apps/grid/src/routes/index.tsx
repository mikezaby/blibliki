import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_PATCH_ID } from "@/patch/defaultPatch";

export const Route = createFileRoute("/")({
  beforeLoad: () =>
    redirect({
      to: "/patch/$patchId",
      params: { patchId: DEFAULT_PATCH_ID },
      search: { mode: undefined },
    }),
});
