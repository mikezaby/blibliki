import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Stack,
  Surface,
  uiColorMix,
  uiTone,
  uiVars,
} from "@blibliki/ui";
import { useUser } from "@clerk/clerk-react";
import { Plus, Trash2, Edit2, Cpu, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { open } from "@/components/Modal/modalSlice";
import { loadDevices, deleteDevice } from "@/devicesSlice";
import { useAppDispatch, useAppSelector } from "@/hooks";
import DeviceModal from "./DeviceModal";

export default function Devices() {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const { devices, status } = useAppSelector((state) => state.devices);
  const [copiedUserId, setCopiedUserId] = useState(false);

  useEffect(() => {
    if (user?.id) {
      void dispatch(loadDevices(user.id));
    }
  }, [dispatch, user?.id]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this device?")) {
      await dispatch(deleteDevice(id));
    }
  };

  const handleEdit = (deviceId: string) => {
    dispatch(open(`device-${deviceId}`));
  };

  const handleAdd = () => {
    dispatch(open("device-new"));
  };

  const handleCopyUserId = async () => {
    if (user?.id) {
      await navigator.clipboard.writeText(user.id);
      setCopiedUserId(true);
      setTimeout(() => {
        setCopiedUserId(false);
      }, 2000);
    }
  };

  if (status === "loading") {
    return (
      <Surface tone="canvas" className="h-screen">
        <Stack align="center" justify="center" className="h-full">
          <p style={{ color: uiVars.text.muted }}>Loading devices...</p>
        </Stack>
      </Surface>
    );
  }

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
            <h1 className="mb-2 text-3xl font-bold">Blibliki Pi Devices</h1>
            <p style={{ color: uiVars.text.muted }}>
              Manage your Raspberry Pi and Node.js devices
            </p>
          </Stack>
          <Button onClick={handleAdd} color="info">
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </Button>
        </Stack>

        {/* User ID Card for Pi Setup */}
        {user?.id && (
          <Surface tone="subtle" border="subtle" radius="lg" className="p-5">
            <Stack
              direction="row"
              align="center"
              justify="between"
              gap={4}
              className="flex-wrap"
            >
              <Stack gap={2} className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  Your User ID (for Pi setup)
                </p>
                <code
                  className="inline-block max-w-full break-all rounded-md border px-3 py-2 font-mono text-sm"
                  style={{
                    background: uiVars.surface.panel,
                    borderColor: uiVars.border.subtle,
                  }}
                >
                  {user.id}
                </code>
                <p className="text-xs" style={{ color: uiVars.text.muted }}>
                  Copy this ID and paste it when starting your Blibliki Pi
                  device
                </p>
              </Stack>
              <Button
                onClick={() => {
                  handleCopyUserId().catch(console.error);
                }}
                variant="outlined"
                color="info"
                size="sm"
                className="shrink-0"
              >
                {copiedUserId ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </Stack>
          </Surface>
        )}

        {devices.length === 0 ? (
          <Card
            className="border-2 border-dashed"
            style={{ borderColor: uiVars.border.subtle }}
          >
            <CardContent className="py-16">
              <Stack align="center" justify="center" gap={4}>
                <Cpu
                  className="mb-4 h-16 w-16"
                  style={{ color: uiVars.text.muted }}
                />
                <Stack align="center" gap={1}>
                  <h3 className="text-xl font-semibold">No devices yet</h3>
                  <p
                    className="max-w-md text-center"
                    style={{ color: uiVars.text.muted }}
                  >
                    Add your first Blibliki Pi device to start running patches
                    on Raspberry Pi or other Node.js environments.
                  </p>
                </Stack>
                <Button onClick={handleAdd} color="info">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Device
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <Card
                key={device.id}
                className="transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-600" />
                    {device.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Stack gap={4}>
                    <Stack gap={1}>
                      <CardDescription className="text-xs uppercase tracking-wide">
                        Token
                      </CardDescription>
                      <div
                        className="break-all rounded p-2 font-mono text-sm"
                        style={{ background: uiVars.surface.panel }}
                      >
                        {device.token.substring(0, 20)}...
                      </div>
                    </Stack>
                    <Stack gap={1}>
                      <CardDescription className="text-xs uppercase tracking-wide">
                        Assigned Patch
                      </CardDescription>
                      <div className="text-sm">
                        {device.patchId ? (
                          <span
                            className="rounded px-2 py-1"
                            style={{
                              background: uiColorMix(
                                uiTone("success"),
                                "transparent",
                                82,
                              ),
                              color: uiTone("success", "600"),
                            }}
                          >
                            Patch assigned
                          </span>
                        ) : (
                          <span style={{ color: uiVars.text.muted }}>
                            No patch assigned
                          </span>
                        )}
                      </div>
                    </Stack>
                    <Stack direction="row" gap={2} className="pt-2">
                      <Button
                        onClick={() => {
                          handleEdit(device.id);
                        }}
                        variant="outlined"
                        color="neutral"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => {
                          handleDelete(device.id).catch(console.error);
                        }}
                        variant="outlined"
                        color="error"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Render modals */}
        <DeviceModal key="new" deviceId="new" />
        {devices.map((device) => (
          <DeviceModal key={device.id} deviceId={device.id} />
        ))}
      </Stack>
    </Surface>
  );
}
