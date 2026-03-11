import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () =>
    redirect({
      to: "/patch/$patchId",
      params: { patchId: "new" },
    }),
});
