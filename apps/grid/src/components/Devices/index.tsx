import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Stack,
  Surface,
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
          <p style={{ color: "var(--ui-color-text-muted)" }}>
            Loading devices...
          </p>
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Blibliki Pi Devices
            </h1>
            <p style={{ color: "var(--ui-color-text-muted)" }}>
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
                <code className="inline-block max-w-full break-all rounded-md border border-slate-300 bg-slate-100 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900">
                  {user.id}
                </code>
                <p
                  className="text-xs"
                  style={{ color: "var(--ui-color-text-muted)" }}
                >
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
          <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700">
            <CardContent className="py-16">
              <Stack align="center" justify="center" gap={4}>
                <Cpu className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4" />
                <Stack align="center" gap={1}>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    No devices yet
                  </h3>
                  <p className="text-center text-slate-600 dark:text-slate-400 max-w-md">
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
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
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
                      <div className="font-mono text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-2 rounded break-all">
                        {device.token.substring(0, 20)}...
                      </div>
                    </Stack>
                    <Stack gap={1}>
                      <CardDescription className="text-xs uppercase tracking-wide">
                        Assigned Patch
                      </CardDescription>
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        {device.patchId ? (
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded">
                            Patch assigned
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">
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
