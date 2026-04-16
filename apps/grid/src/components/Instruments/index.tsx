import { Instrument, type IInstrument } from "@blibliki/models";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Stack,
  Surface,
  Text,
} from "@blibliki/ui";
import { useUser } from "@clerk/clerk-react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  FolderKanban,
  Plus,
  SlidersHorizontal,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAppDispatch, useInstruments } from "@/hooks";
import { createNewInstrumentForUser } from "@/instruments/createInstrument";
import type { InstrumentDocument } from "@/instruments/document";
import { addNotification } from "@/notificationsSlice";

function getTrackSummary(instrument: IInstrument) {
  const document = instrument.document as InstrumentDocument;

  return Array.isArray(document.tracks)
    ? `${document.tracks.length} tracks`
    : "0 tracks";
}

export default function Instruments() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useUser();
  const instruments = useInstruments();
  const [creating, setCreating] = useState(false);
  const [visibleInstruments, setVisibleInstruments] = useState<IInstrument[]>(
    [],
  );
  const [deletingInstrumentId, setDeletingInstrumentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setVisibleInstruments(instruments);
  }, [instruments]);

  const handleCreate = async () => {
    if (!user?.id || creating) {
      return;
    }

    setCreating(true);

    try {
      const instrument = createNewInstrumentForUser(user.id);
      await instrument.save();

      dispatch(
        addNotification({
          type: "success",
          title: "Instrument created",
          message: `"${instrument.name}" is ready to edit.`,
          duration: 3000,
        }),
      );

      await navigate({
        to: "/instrument/$instrumentId",
        params: { instrumentId: instrument.id },
        search: { mode: undefined },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      dispatch(
        addNotification({
          type: "error",
          title: "Failed to create instrument",
          message: errorMessage,
          duration: 5000,
        }),
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (instrument: IInstrument) => {
    if (
      instrument.userId !== user?.id ||
      deletingInstrumentId === instrument.id
    ) {
      return;
    }

    if (!confirm("Are you sure you want to delete this instrument?")) {
      return;
    }

    setDeletingInstrumentId(instrument.id);

    try {
      const instrumentRecord = await Instrument.find(instrument.id);
      await instrumentRecord.delete();

      setVisibleInstruments((current) =>
        current.filter(({ id }) => id !== instrument.id),
      );

      dispatch(
        addNotification({
          type: "success",
          title: "Instrument deleted",
          message: `"${instrument.name}" has been deleted.`,
          duration: 3000,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      dispatch(
        addNotification({
          type: "error",
          title: "Failed to delete instrument",
          message: errorMessage,
          duration: 5000,
        }),
      );
    } finally {
      setDeletingInstrumentId(null);
    }
  };

  return (
    <Surface tone="canvas" className="h-screen overflow-auto p-8">
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
              Create document-based instruments for Pi deployment and controller
              performance
            </Text>
          </Stack>
          <Button onClick={() => void handleCreate()} color="info">
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Creating..." : "Create Instrument"}
          </Button>
        </Stack>

        {visibleInstruments.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16">
              <Stack align="center" justify="center" gap={4}>
                <FolderKanban className="mb-4 h-16 w-16 text-content-muted" />
                <Stack align="center" gap={1}>
                  <Text asChild weight="semibold" className="text-xl">
                    <h3>No instruments yet</h3>
                  </Text>
                  <Text tone="muted" className="max-w-md text-center">
                    Start a new instrument document, then shape track source,
                    FX, routing profile, and sequencer content from the editor.
                  </Text>
                </Stack>
                <Button onClick={() => void handleCreate()} color="info">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Instrument
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleInstruments.map((instrument) => {
              const document = instrument.document as InstrumentDocument;
              const canDelete = instrument.userId === user?.id;
              const isDeleting = deletingInstrumentId === instrument.id;

              return (
                <Card
                  key={instrument.id}
                  className="transition-shadow hover:shadow-lg"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SlidersHorizontal className="h-5 w-5 text-brand" />
                      {instrument.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Stack gap={4}>
                      <Stack gap={1}>
                        <CardDescription className="text-xs uppercase tracking-wide">
                          Template
                        </CardDescription>
                        <Badge tone="info" variant="soft" size="sm">
                          {document.templateId}
                        </Badge>
                      </Stack>

                      <Stack gap={1}>
                        <CardDescription className="text-xs uppercase tracking-wide">
                          Tracks
                        </CardDescription>
                        <Text size="sm">{getTrackSummary(instrument)}</Text>
                      </Stack>

                      <Stack gap={1}>
                        <CardDescription className="text-xs uppercase tracking-wide">
                          Owner
                        </CardDescription>
                        {instrument.userId ? (
                          <Text asChild tone="muted" size="sm">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {instrument.userId.slice(0, 8)}...
                            </span>
                          </Text>
                        ) : (
                          <Text tone="muted" size="sm">
                            Unknown
                          </Text>
                        )}
                      </Stack>

                      <Stack direction="row" gap={2}>
                        <Button
                          asChild
                          color="neutral"
                          variant="outlined"
                          size="sm"
                          className={canDelete ? "flex-1" : "w-full"}
                        >
                          <Link
                            to="/instrument/$instrumentId"
                            params={{ instrumentId: instrument.id }}
                            search={{ mode: undefined }}
                          >
                            Open Instrument
                          </Link>
                        </Button>
                        {canDelete ? (
                          <Button
                            onClick={() => {
                              void handleDelete(instrument);
                            }}
                            variant="outlined"
                            color="error"
                            size="sm"
                            disabled={isDeleting}
                            aria-label={`Delete ${instrument.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </Stack>
    </Surface>
  );
}
