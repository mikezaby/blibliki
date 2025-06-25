import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import Grid from "@/components/Grid";
import { useAppDispatch } from "@/hooks";
import { loadById } from "@/patchSlice";

export const Route = createFileRoute("/patch/$patchId")({
  component: PatchPage,
});

function PatchPage() {
  const { patchId } = Route.useParams();
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(loadById(patchId));
  }, [dispatch, patchId]);

  return <Grid />;
}
