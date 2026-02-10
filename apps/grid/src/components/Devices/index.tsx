import {
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
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
      <Flex align="center" justify="center" minH="100vh">
        <Text color="fg.muted">Loading devices...</Text>
      </Flex>
    );
  }

  return (
    <Box p="8" minH="100vh" bg="appBg" overflow="auto">
      <Box maxW="6xl" mx="auto">
        <Flex align="center" justify="space-between" mb="8">
          <Box>
            <Heading size="xl" mb="2">
              Blibliki Pi Devices
            </Heading>
            <Text color="fg.muted">
              Manage your Raspberry Pi and Node.js devices
            </Text>
          </Box>
          <Button onClick={handleAdd}>
            <Plus size={16} />
            Add Device
          </Button>
        </Flex>

        {/* User ID Card for Pi Setup */}
        {user?.id && (
          <Card mb="6" bg="blue.50" borderColor="blue.200">
            <CardContent py="4">
              <Flex align="center" justify="space-between" gap="4">
                <Box flex="1">
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color="blue.900"
                    mb="1"
                  >
                    Your User ID (for Pi setup)
                  </Text>
                  <Box
                    as="code"
                    display="inline-block"
                    fontFamily="mono"
                    fontSize="sm"
                    color="blue.700"
                    bg="blue.100"
                    px="3"
                    py="2"
                    rounded="md"
                  >
                    {user.id}
                  </Box>
                  <Text fontSize="xs" color="blue.600" mt="2">
                    Copy this ID and paste it when starting your Blibliki Pi
                    device
                  </Text>
                </Box>
                <Button
                  onClick={() => {
                    handleCopyUserId().catch(console.error);
                  }}
                  variant="outline"
                  size="sm"
                  ml="4"
                >
                  {copiedUserId ? (
                    <>
                      <Check size={16} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </Button>
              </Flex>
            </CardContent>
          </Card>
        )}

        {devices.length === 0 ? (
          <Card borderWidth="2px" borderStyle="dashed" borderColor="border">
            <CardContent py="16">
              <VStack gap="4">
                <Cpu size={64} />
                <Heading size="lg">No devices yet</Heading>
                <Text color="fg.muted" textAlign="center" maxW="md">
                  Add your first Blibliki Pi device to start running patches on
                  Raspberry Pi or other Node.js environments.
                </Text>
                <Button onClick={handleAdd}>
                  <Plus size={16} />
                  Add Your First Device
                </Button>
              </VStack>
            </CardContent>
          </Card>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6">
            {devices.map((device) => (
              <Card key={device.id}>
                <CardHeader>
                  <CardTitle display="flex" alignItems="center" gap="2">
                    <Cpu size={20} />
                    {device.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VStack align="stretch" gap="3">
                    <Box>
                      <Text
                        fontSize="xs"
                        color="fg.muted"
                        textTransform="uppercase"
                        mb="1"
                      >
                        Token
                      </Text>
                      <Box
                        as="code"
                        display="block"
                        fontFamily="mono"
                        fontSize="sm"
                        bg="bg.muted"
                        p="2"
                        rounded="md"
                        wordBreak="break-all"
                      >
                        {device.token.substring(0, 20)}...
                      </Box>
                    </Box>
                    <Box>
                      <Text
                        fontSize="xs"
                        color="fg.muted"
                        textTransform="uppercase"
                        mb="1"
                      >
                        Assigned Patch
                      </Text>
                      {device.patchId ? (
                        <Badge colorPalette="green" variant="subtle">
                          Patch assigned
                        </Badge>
                      ) : (
                        <Text fontSize="sm" color="fg.muted">
                          No patch assigned
                        </Text>
                      )}
                    </Box>
                    <HStack gap="2" pt="2">
                      <Button
                        onClick={() => {
                          handleEdit(device.id);
                        }}
                        variant="outline"
                        size="sm"
                        flex="1"
                      >
                        <Edit2 size={16} />
                        Edit
                      </Button>
                      <Button
                        onClick={() => {
                          handleDelete(device.id).catch(console.error);
                        }}
                        variant="outline"
                        size="sm"
                        colorPalette="red"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </HStack>
                  </VStack>
                </CardContent>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Box>

      {/* Render modals */}
      <DeviceModal key="new" deviceId="new" />
      {devices.map((device) => (
        <DeviceModal key={device.id} deviceId={device.id} />
      ))}
    </Box>
  );
}
