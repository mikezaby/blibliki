import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, FolderOpen, Search, User } from "lucide-react";
import { useState } from "react";
import Modal, { close as closeModal } from "@/components/Modal";
import { Button, Input } from "@/components/ui";
import { useAppDispatch, usePatches } from "@/hooks";

export default function LoadPatchModal() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const patches = usePatches();
  const [searchQuery, setSearchQuery] = useState("");

  const close = () => {
    dispatch(closeModal("patch"));
  };

  const loadPatch = (patchId: string) => {
    close();
    void navigate({
      to: "/patch/$patchId",
      params: { patchId },
    });
  };

  const filteredPatches = patches.filter((patch) =>
    patch.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal
      modalName="patch"
      contentProps={{
        maxW: { base: "calc(100vw - 2rem)", sm: "2xl" },
        p: 0,
        gap: 0,
        bg: "surfaceBg",
        borderColor: "border",
      }}
    >
      <Flex
        direction="column"
        maxH={{ base: "calc(100vh - 6rem)", sm: "36rem" }}
      >
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
            <FolderOpen size={16} />
          </Flex>
          <Box flex="1" minW="0">
            <Text fontSize="lg" fontWeight="semibold" letterSpacing="tight">
              Load Patch
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Select a patch to load into the grid
            </Text>
          </Box>
        </Flex>

        <Box p="4" borderBottomWidth="1px" borderColor="border" bg="bg.muted">
          <Box position="relative">
            <Box
              position="absolute"
              left="3"
              top="50%"
              transform="translateY(-50%)"
              color="fg.muted"
              pointerEvents="none"
            >
              <Search size={16} />
            </Box>
            <Input
              placeholder="Search patches..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
              ps="10"
              bg="surfaceBg"
              borderColor="border"
            />
          </Box>
        </Box>

        <Box maxH="24rem" overflowY="auto">
          {filteredPatches.length === 0 ? (
            <Flex direction="column" align="center" py="10" px="6">
              <Box color="fg.subtle" mb="4">
                <FolderOpen size={48} />
              </Box>
              <Text fontSize="sm" color="fg.muted">
                {searchQuery
                  ? "No patches match your search"
                  : "No patches found"}
              </Text>
            </Flex>
          ) : (
            <Box as="ul" listStyle="none" m="0" p="2">
              {filteredPatches.map(({ id, name, userId }) => (
                <Box as="li" key={id}>
                  <Button
                    variant="ghost"
                    w="full"
                    h="auto"
                    p="3"
                    borderWidth="1px"
                    borderColor="transparent"
                    justifyContent="space-between"
                    alignItems="center"
                    rounded="md"
                    onClick={() => {
                      loadPatch(id);
                    }}
                    _hover={{ bg: "bg.muted", borderColor: "border" }}
                  >
                    <Box flex="1" minW="0">
                      <HStack gap="2" mb="1">
                        <Box
                          w="2"
                          h="2"
                          rounded="full"
                          bgGradient="linear(to-br, brand.500, brand.700)"
                        />
                        <Text
                          fontWeight="medium"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                        >
                          {name || "Untitled Patch"}
                        </Text>
                      </HStack>
                      {userId && (
                        <HStack gap="1.5" fontSize="xs" color="fg.muted">
                          <User size={12} />
                          <Text>{userId.slice(0, 8)}...</Text>
                        </HStack>
                      )}
                    </Box>
                    <Box color="fg.subtle">
                      <ChevronRight size={16} />
                    </Box>
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Flex
          align="center"
          justify="space-between"
          p="4"
          borderTopWidth="1px"
          borderColor="border"
          bg="bg.muted"
        >
          <Text fontSize="xs" color="fg.muted" fontStyle="italic">
            {filteredPatches.length}{" "}
            {filteredPatches.length === 1 ? "patch" : "patches"} available
          </Text>
          <Button variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}
