import { IDevice } from "@blibliki/models";
import { useUser } from "@clerk/clerk-react";
import { Cpu, Save } from "lucide-react";
import { useState } from "react";
import Modal, { close as closeModal } from "@/components/Modal";
import Select from "@/components/Select";
import { Button, Input, Label } from "@/components/ui";
import { saveDevice } from "@/devicesSlice";
import { useAppDispatch, useAppSelector, usePatches } from "@/hooks";

type DeviceModalProps = {
  deviceId: string;
};

type DeviceFormProps = {
  device: IDevice | null;
  isNew: boolean;
  deviceId: string;
  onClose: () => void;
};

function DeviceForm({ device, isNew, deviceId, onClose }: DeviceFormProps) {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const patches = usePatches();

  const [formData, setFormData] = useState({
    token: device?.token ?? "",
    name: device?.name ?? "",
    patchId: device?.patchId ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.token.trim()) {
      newErrors.token = "Token is required";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user?.id) return;

    try {
      await dispatch(
        saveDevice({
          id: isNew ? undefined : deviceId,
          token: formData.token,
          name: formData.name,
          patchId: formData.patchId || null,
          userId: user.id,
        }),
      );
      onClose();
    } catch (error) {
      console.error("Error saving device:", error);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-t-lg">
        <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
          <Cpu className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
            {isNew ? "Add Device" : "Edit Device"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isNew
              ? "Configure a new Blibliki Pi device"
              : "Update device settings"}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token" className="text-slate-700 dark:text-slate-300">
            Token *
          </Label>
          <Input
            id="token"
            placeholder="Enter the token from your Raspberry Pi"
            value={formData.token}
            onChange={(e) => {
              setFormData({ ...formData, token: e.target.value });
            }}
            className={`font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 ${
              errors.token ? "border-red-500" : ""
            }`}
          />
          {errors.token && (
            <p className="text-sm text-red-500">{errors.token}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Copy this from the blibliki-pi output on your device
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
            Device Name *
          </Label>
          <Input
            id="name"
            placeholder="e.g., Experimental Synth"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
            }}
            className={`bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 ${
              errors.name ? "border-red-500" : ""
            }`}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="patchId"
            className="text-slate-700 dark:text-slate-300"
          >
            Assigned Patch
          </Label>
          <Select
            label="Select patch"
            value={formData.patchId}
            options={patches}
            onChange={(value) => {
              setFormData({ ...formData, patchId: value });
            }}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This patch will be auto-loaded when the device starts
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-lg">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              void handleSave();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-1" />
            {isNew ? "Add Device" : "Save Changes"}
          </Button>
        </div>
      </div>
    </>
  );
}

export default function DeviceModal({ deviceId }: DeviceModalProps) {
  const dispatch = useAppDispatch();
  const devices = useAppSelector((state) => state.devices.devices);
  const { isOpen, modalName: currentModalName } = useAppSelector(
    (state) => state.modal,
  );

  const isNew = deviceId === "new";
  const device = isNew
    ? null
    : (devices.find((d) => d.id === deviceId) ?? null);
  const modalName = `device-${deviceId}`;
  const isThisModalOpen = isOpen && currentModalName === modalName;

  const close = () => {
    dispatch(closeModal(modalName));
  };

  return (
    <Modal
      modalName={modalName}
      className="sm:max-w-lg max-w-[calc(100vw-2rem)] p-0 gap-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      onClose={close}
    >
      {isThisModalOpen && (
        <DeviceForm
          key={modalName}
          device={device}
          isNew={isNew}
          deviceId={deviceId}
          onClose={close}
        />
      )}
    </Modal>
  );
}
