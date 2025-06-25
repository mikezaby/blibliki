import { createFileRoute } from "@tanstack/react-router";
import Grid from "@/components/Grid";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <Grid />;
}
