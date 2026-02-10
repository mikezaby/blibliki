import { Box, Flex, Text } from "@chakra-ui/react";
import { PanelLeftClose, PanelLeftOpen, Blocks } from "lucide-react";
import { useState, DragEvent } from "react";
import { AvailableModules } from "@/components/AudioModule/modulesSlice";
import useDrag from "@/components/Grid/useDrag";
import { Button } from "@/components/ui";

const SupportedModules = Object.values(AvailableModules)
  .map(({ moduleType }) => moduleType)
  .sort();

export default function AudioModules() {
  const [visible, setVisible] = useState<boolean>(true);
  const { onDragStart } = useDrag();

  const onClick = () => {
    setVisible(!visible);
  };
  const left = visible ? "0px" : "-189px";

  return (
    <Box
      position="absolute"
      zIndex="10"
      top="12"
      left={left}
      w="189px"
      h="calc(100vh - 3rem)"
      bg="surfaceBg"
      borderRightWidth="1px"
      borderBottomWidth="1px"
      borderColor="border"
      boxShadow="xl"
      transition="left 0.3s ease-in-out"
      display="flex"
      flexDirection="column"
    >
      <Flex
        align="center"
        gap="2"
        p="4"
        borderBottomWidth="1px"
        borderColor="border"
        bg="surfaceBg"
      >
        <Flex
          w="5"
          h="5"
          rounded="sm"
          align="center"
          justify="center"
          bgGradient="linear(to-br, brand.500, brand.700)"
          color="white"
          boxShadow="sm"
        >
          <Blocks size={12} />
        </Flex>
        <Text fontSize="sm" fontWeight="semibold" letterSpacing="tight">
          Audio Modules
        </Text>
      </Flex>

      <Button
        variant="ghost"
        position="absolute"
        left="189px"
        top="0"
        h="13"
        roundedLeft="none"
        roundedRight="md"
        borderRightWidth="1px"
        borderBottomWidth="1px"
        borderColor="border"
        bg="surfaceBg"
        boxShadow="lg"
        _hover={{ bg: "bg.muted" }}
        aria-label={visible ? "Hide audio modules" : "Show audio modules"}
        onClick={onClick}
      >
        {visible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </Button>

      <Box as="nav" flex="1" overflowY="auto" py="2">
        <Box
          as="ul"
          listStyle="none"
          m="0"
          px="3"
          display="flex"
          flexDirection="column"
          gap="1"
        >
          {SupportedModules.map((moduleName) => (
            <Box as="li" key={moduleName}>
              <Button
                variant="ghost"
                w="full"
                justifyContent="flex-start"
                cursor="move"
                h="9"
                px="3"
                fontSize="sm"
                fontWeight="medium"
                borderWidth="1px"
                borderColor="border"
                bg="surfaceBg"
                _hover={{ bg: "bg.muted" }}
                onDragStart={(event: DragEvent) => {
                  onDragStart(event, moduleName);
                }}
                draggable
              >
                <Flex align="center" gap="2" w="full">
                  <Box
                    w="2"
                    h="2"
                    rounded="full"
                    bgGradient="linear(to-br, brand.500, brand.700)"
                  />
                  <Text
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {moduleName}
                  </Text>
                </Flex>
              </Button>
            </Box>
          ))}
        </Box>

        <Box px="3" pt="4" pb="2">
          <Text fontSize="xs" color="fg.muted" fontStyle="italic">
            Drag modules to the grid to add them
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
