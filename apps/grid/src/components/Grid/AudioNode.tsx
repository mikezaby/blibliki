import { IIOSerialize } from "@blibliki/engine";
import { Box, Flex, Text } from "@chakra-ui/react";
import { Handle, HandleType, NodeProps, Position } from "@xyflow/react";
import { Settings } from "lucide-react";
import { ReactNode, useMemo } from "react";
import AudioModule from "@/components/AudioModule";
import { useAudioModule } from "@/hooks";
import Name from "../AudioModule/attributes/Name";
import Voices from "../AudioModule/attributes/Voices";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui";

export const NodeTypes = {
  audioNode: AudioNode,
};

export const getNodeContainerStyleProps = (selected: boolean) =>
  selected
    ? {
        borderColor: "cyan.500",
        ring: "4px",
        ringColor: "cyan.300",
        boxShadow: "2xl",
        transform: "scale(1.015)",
        _dark: { ringColor: "cyan.700" },
      }
    : {
        borderColor: "border",
        boxShadow: "lg",
      };

export default function AudioNode(props: NodeProps) {
  const { id, selected } = props;
  const audioModule = useAudioModule(id);
  if (!audioModule) return null;

  const { inputs, outputs, ...audioModuleProps } = audioModule;
  const containerStyleProps = getNodeContainerStyleProps(selected);

  return (
    <Dialog>
      <Flex
        cursor="grab"
        align="stretch"
        rounded="lg"
        borderWidth="1px"
        minW="200px"
        transition="all 0.2s"
        bg="surfaceBg"
        _hover={
          selected ? undefined : { borderColor: "gray.300", boxShadow: "xl" }
        }
        {...containerStyleProps}
      >
        {inputs.length > 0 && (
          <IOContainer type="input">
            {inputs.map((io) => (
              <IO key={io.id} io={io} />
            ))}
          </IOContainer>
        )}

        <Flex
          position="relative"
          direction="column"
          justify="center"
          p="3"
          gap="2"
        >
          <Flex align="center" gap="2" pe="7">
            <Box
              w="2"
              h="2"
              rounded="full"
              bgGradient="linear(to-br, brand.500, brand.700)"
            />
            <Text
              fontSize="sm"
              fontWeight="medium"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {audioModule.name || audioModule.moduleType}
            </Text>
            <DialogTrigger asChild>
              <Box as="button" cursor="pointer" color="fg.muted">
                <Settings size={12} />
              </Box>
            </DialogTrigger>
          </Flex>
          <AudioModule audioModule={audioModuleProps} />
        </Flex>

        {outputs.length > 0 && (
          <IOContainer type="output">
            {outputs.map((io) => (
              <IO key={io.id} io={io} />
            ))}
          </IOContainer>
        )}
      </Flex>

      <DialogContent maxW={{ base: "calc(100vw - 2rem)", sm: "md" }}>
        <DialogHeader>
          <DialogTitle>Module Settings</DialogTitle>
          <DialogDescription>
            Configure name and voice settings for this module.
          </DialogDescription>
        </DialogHeader>
        <Flex direction="column" gap="3">
          <Name
            id={audioModule.id}
            moduleType={audioModule.moduleType}
            value={audioModule.name}
          />
          {"voices" in audioModule && (
            <Voices
              id={audioModule.id}
              moduleType={audioModule.moduleType}
              value={audioModule.voices}
            />
          )}
        </Flex>
      </DialogContent>
    </Dialog>
  );
}

function IO({ io }: { io: IIOSerialize }) {
  const handleProps = useMemo(() => {
    const isInput = io.ioType.includes("Input");
    const position = isInput ? Position.Left : Position.Right;
    const type: HandleType = isInput ? "target" : "source";
    const getGradientBackground = (ioType: string) =>
      ioType.toLowerCase().includes("audio")
        ? "linear-gradient(90deg, #3a5fd6, #4d78f4)"
        : "linear-gradient(90deg, #805ad5, #d53f8c)";

    const gradientBackground = getGradientBackground(io.ioType);

    return { type, position, gradientBackground, isInput };
  }, [io.ioType]);

  return (
    <Flex position="relative" align="center">
      <Text
        px="3"
        py="2"
        w="full"
        fontSize="xs"
        fontWeight="medium"
        color="fg"
        textAlign={handleProps.isInput ? "left" : "right"}
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {io.name}
      </Text>
      <Handle
        id={io.name}
        type={handleProps.type}
        position={handleProps.position}
        style={{
          ...(handleProps.isInput ? { left: -8 } : { right: -8 }),
          width: 16,
          height: 16,
          borderRadius: "9999px",
          borderWidth: 2,
          borderColor: "#ffffff",
          boxShadow: "0 6px 12px rgba(15, 23, 42, 0.2)",
          cursor: "pointer",
          background: handleProps.gradientBackground,
        }}
      />

      <Box
        position="absolute"
        top="50%"
        transform="translateY(-50%)"
        {...(handleProps.isInput ? { left: "-1" } : { right: "-1" })}
        w="1"
        h="1"
        rounded="full"
        opacity={0.7}
        background={handleProps.gradientBackground}
      />
    </Flex>
  );
}

function IOContainer({
  children,
  type,
}: {
  children: ReactNode;
  type: "input" | "output";
}) {
  const isInput = type === "input";

  return (
    <Flex
      direction="column"
      justify="center"
      minW="80px"
      bg="bg.muted"
      {...(isInput ? { roundedLeft: "lg" } : { roundedRight: "lg" })}
    >
      <Flex direction="column" py="2">
        {children}
      </Flex>
    </Flex>
  );
}
