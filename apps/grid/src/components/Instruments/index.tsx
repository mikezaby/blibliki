import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Stack,
  Surface,
  Text,
} from "@blibliki/ui";
import { Link } from "@tanstack/react-router";
import { Edit2, Plus, SlidersHorizontal } from "lucide-react";
import { useInstruments } from "@/hooks";

export default function Instruments() {
  const instruments = useInstruments();

  return (
    <Surface tone="canvas" className="min-h-screen overflow-auto p-8">
      <Stack className="mx-auto w-full max-w-6xl" gap={6}>
        <Stack
          direction="row"
          align="center"
          justify="between"
          gap={4}
          className="flex-wrap"
        >
          <Stack gap={1}>
            <Text asChild weight="semibold" className="mb-2 text-3xl">
              <h1>Instruments</h1>
            </Text>
            <Text tone="muted">
              Author and manage standalone performance instruments.
            </Text>
          </Stack>

          <Button asChild color="info">
            <Link
              to="/instruments/$instrumentId"
              params={{ instrumentId: "new" }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Instrument
            </Link>
          </Button>
        </Stack>

        {instruments.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16">
              <Stack align="center" justify="center" gap={4}>
                <SlidersHorizontal className="mb-4 h-16 w-16 text-content-muted" />
                <Stack align="center" gap={1}>
                  <Text asChild weight="semibold" className="text-xl">
                    <h2>No instruments yet</h2>
                  </Text>
                  <Text tone="muted" className="max-w-md text-center">
                    Start your first hardware-oriented instrument document and
                    edit it in the dedicated instrument editor.
                  </Text>
                </Stack>

                <Button asChild color="info">
                  <Link
                    to="/instruments/$instrumentId"
                    params={{ instrumentId: "new" }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Instrument
                  </Link>
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {instruments.map((instrument) => (
              <Card
                key={instrument.id}
                className="transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <CardTitle>{instrument.name}</CardTitle>
                </CardHeader>

                <CardContent>
                  <Stack gap={4}>
                    <Stack gap={1}>
                      <Text tone="muted" size="sm">
                        Template
                      </Text>
                      <Text className="font-medium">
                        {instrument.document.templateId}
                      </Text>
                    </Stack>

                    <Stack gap={1}>
                      <Text tone="muted" size="sm">
                        Tracks
                      </Text>
                      <Text className="font-medium">
                        {instrument.document.tracks.length}
                      </Text>
                    </Stack>

                    <Button
                      asChild
                      variant="outlined"
                      color="neutral"
                      size="sm"
                    >
                      <Link
                        to="/instruments/$instrumentId"
                        params={{ instrumentId: instrument.id }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Open
                      </Link>
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Stack>
    </Surface>
  );
}
