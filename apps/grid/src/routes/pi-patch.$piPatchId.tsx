import { createFileRoute } from "@tanstack/react-router";
import PiPatcher from "@/components/PiPatcher";

export const Route = createFileRoute("/pi-patch/$piPatchId")({
  component: PiPatchPage,
});

function PiPatchPage() {
  const { piPatchId } = Route.useParams();
  return <PiPatcher piPatchId={piPatchId} />;
}
