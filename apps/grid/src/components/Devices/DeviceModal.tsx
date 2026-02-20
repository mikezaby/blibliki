import { IDevice } from "@blibliki/models";
import {
  Button,
  Divider,
  Input,
  Label,
  OptionSelect,
  Stack,
  Surface,
  Text,
} from "@blibliki/ui";
import { useUser } from "@clerk/clerk-react";
import { Cpu, Save } from "lucide-react";
import { useState } from "react";
import Modal, { close as closeModal } from "@/components/Modal";
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
    <Surface
      tone="raised"
      border="subtle"
      radius="lg"
      className="overflow-hidden"
    >
      <Surface tone="panel" radius="none" asChild>
        <header className="p-6">
          <Stack direction="row" align="center" gap={3}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-brand to-brand-secondary shadow-sm">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold tracking-tight">
                {isNew ? "Add Device" : "Edit Device"}
              </h2>
              <Text tone="muted">
                {isNew
                  ? "Configure a new Blibliki Pi device"
                  : "Update device settings"}
              </Text>
            </div>
          </Stack>
        </header>
      </Surface>

      <Divider />

      <Stack gap={4} className="p-6">
        <Stack gap={2}>
          <Label htmlFor="token">Token *</Label>
          <Input
            id="token"
            placeholder="Enter the token from your Raspberry Pi"
            value={formData.token}
            aria-invalid={Boolean(errors.token)}
            onChange={(e) => {
              setFormData({ ...formData, token: e.target.value });
            }}
            className="font-mono"
          />
          {errors.token && <Text tone="error">{errors.token}</Text>}
          <Text tone="muted" size="xs">
            Copy this from the blibliki-pi output on your device
          </Text>
        </Stack>

        <Stack gap={2}>
          <Label htmlFor="name">Device Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Experimental Synth"
            value={formData.name}
            aria-invalid={Boolean(errors.name)}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
            }}
          />
          {errors.name && <Text tone="error">{errors.name}</Text>}
        </Stack>

        <Stack gap={2}>
          <Label htmlFor="patchId">Assigned Patch</Label>
          <OptionSelect
            label="Select patch"
            value={formData.patchId}
            options={patches}
            onChange={(value: string) => {
              setFormData({ ...formData, patchId: value });
            }}
          />
          <Text tone="muted" size="xs">
            This patch will be auto-loaded when the device starts
          </Text>
        </Stack>
      </Stack>

      <Divider />

      <Surface tone="panel" radius="none" asChild>
        <footer className="p-4">
          <Stack direction="row" justify="end" gap={2}>
            <Button
              variant="text"
              color="secondary"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="info"
              onClick={() => {
                void handleSave();
              }}
            >
              <Save className="mr-1 h-4 w-4" />
              {isNew ? "Add Device" : "Save Changes"}
            </Button>
          </Stack>
        </footer>
      </Surface>
    </Surface>
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
      className="sm:max-w-lg max-w-[calc(100vw-2rem)] p-0 gap-0 border-0 bg-transparent shadow-none"
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
