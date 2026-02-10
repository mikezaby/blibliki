import type { IDevice } from "@blibliki/models";
import { Box, Flex, Text } from "@chakra-ui/react";
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
    <Flex direction="column">
      <Flex
        align="center"
        gap="3"
        p="6"
        borderBottomWidth="1px"
        borderColor="border"
        bg="bg.muted"
      >
        <Flex
          w="8"
          h="8"
          rounded="md"
          align="center"
          justify="center"
          bgGradient="linear(to-br, brand.500, brand.700)"
          color="white"
          boxShadow="sm"
        >
          <Cpu size={16} />
        </Flex>
        <Box flex="1" minW="0">
          <Text fontSize="lg" fontWeight="semibold" letterSpacing="tight">
            {isNew ? "Add Device" : "Edit Device"}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {isNew
              ? "Configure a new Blibliki Pi device"
              : "Update device settings"}
          </Text>
        </Box>
      </Flex>

      <Box p="6">
        <Flex direction="column" gap="4">
          <Box>
            <Label htmlFor="token" color="fg">
              Token *
            </Label>
            <Input
              id="token"
              mt="2"
              placeholder="Enter the token from your Raspberry Pi"
              value={formData.token}
              onChange={(event) => {
                setFormData({ ...formData, token: event.target.value });
              }}
              fontFamily="mono"
              bg="surfaceBg"
              borderColor={errors.token ? "red.500" : "border"}
            />
            {errors.token && (
              <Text mt="2" fontSize="sm" color="red.500">
                {errors.token}
              </Text>
            )}
            <Text mt="2" fontSize="xs" color="fg.muted">
              Copy this from the blibliki-pi output on your device
            </Text>
          </Box>

          <Box>
            <Label htmlFor="name" color="fg">
              Device Name *
            </Label>
            <Input
              id="name"
              mt="2"
              placeholder="e.g., Experimental Synth"
              value={formData.name}
              onChange={(event) => {
                setFormData({ ...formData, name: event.target.value });
              }}
              bg="surfaceBg"
              borderColor={errors.name ? "red.500" : "border"}
            />
            {errors.name && (
              <Text mt="2" fontSize="sm" color="red.500">
                {errors.name}
              </Text>
            )}
          </Box>

          <Box>
            <Label htmlFor="patchId" color="fg">
              Assigned Patch
            </Label>
            <Box mt="2">
              <Select
                label="Select patch"
                value={formData.patchId}
                options={patches}
                onChange={(value) => {
                  setFormData({ ...formData, patchId: value });
                }}
              />
            </Box>
            <Text mt="2" fontSize="xs" color="fg.muted">
              This patch will be auto-loaded when the device starts
            </Text>
          </Box>
        </Flex>
      </Box>

      <Flex
        p="4"
        borderTopWidth="1px"
        borderColor="border"
        bg="bg.muted"
        justify="flex-end"
        gap="2"
      >
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => {
            void handleSave();
          }}
        >
          <Save size={16} />
          {isNew ? "Add Device" : "Save Changes"}
        </Button>
      </Flex>
    </Flex>
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
      contentProps={{
        maxW: { base: "calc(100vw - 2rem)", sm: "lg" },
        p: 0,
        gap: 0,
        bg: "surfaceBg",
        borderColor: "border",
      }}
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
