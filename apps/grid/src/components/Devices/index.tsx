import { useUser } from "@clerk/clerk-react";
import { Plus, Trash2, Edit2, Cpu, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { open } from "@/components/Modal/modalSlice";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-600 dark:text-slate-400">
          Loading devices...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-screen bg-slate-50 dark:bg-slate-900 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Blibliki Pi Devices
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage your Raspberry Pi and Node.js devices
            </p>
          </div>
          <Button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </Button>
        </div>

        {/* User ID Card for Pi Setup */}
        {user?.id && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Your User ID (for Pi setup)
                  </div>
                  <div className="font-mono text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-3 py-2 rounded inline-block">
                    {user.id}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Copy this ID and paste it when starting your Blibliki Pi
                    device
                  </p>
                </div>
                <Button
                  onClick={() => {
                    handleCopyUserId().catch(console.error);
                  }}
                  variant="outline"
                  size="sm"
                  className="ml-4 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
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
              </div>
            </CardContent>
          </Card>
        )}

        {devices.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Cpu className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                No devices yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-center mb-6 max-w-md">
                Add your first Blibliki Pi device to start running patches on
                Raspberry Pi or other Node.js environments.
              </p>
              <Button
                onClick={handleAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Device
              </Button>
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
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Token
                      </div>
                      <div className="font-mono text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-2 rounded break-all">
                        {device.token.substring(0, 20)}...
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Assigned Patch
                      </div>
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
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => {
                          handleEdit(device.id);
                        }}
                        variant="outline"
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
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Render modals */}
      <DeviceModal key="new" deviceId="new" />
      {devices.map((device) => (
        <DeviceModal key={device.id} deviceId={device.id} />
      ))}
    </div>
  );
}
