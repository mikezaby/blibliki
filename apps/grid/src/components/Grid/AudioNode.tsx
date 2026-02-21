import { IIOSerialize } from "@blibliki/engine";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  IconButton,
  Stack,
  Surface,
  Text,
} from "@blibliki/ui";
import { Handle, HandleType, NodeProps, Position } from "@xyflow/react";
import { Settings } from "lucide-react";
import { ReactNode, useMemo } from "react";
import AudioModule from "@/components/AudioModule";
import { useAudioModule } from "@/hooks";
import { cn } from "@/lib/utils";
import Name from "../AudioModule/attributes/Name";
import Voices from "../AudioModule/attributes/Voices";

export const NodeTypes = {
  audioNode: AudioNode,
};

export const getNodeContainerClassName = (selected: boolean) =>
  cn(
    "flex cursor-grab items-stretch rounded-lg border min-w-[200px] transition-all duration-200",
    "bg-surface-raised shadow-lg hover:shadow-xl",
    selected
      ? "border-info ring-4 ring-info/35 shadow-2xl scale-[1.015]"
      : "border-border-subtle hover:border-border-strong",
  );

type IOTone = "audio" | "midi";

const getIOTone = (ioType: string): IOTone =>
  ioType.toLowerCase().includes("audio") ? "audio" : "midi";

export const getIOToneClasses = (ioType: string) => {
  const tone = getIOTone(ioType);

  if (tone === "audio") {
    return {
      tone,
      handleToneClass: "io-handle--audio",
      indicatorToneClass: "io-indicator--audio",
      labelToneClass: "io-label--audio",
    };
  }

  return {
    tone,
    handleToneClass: "io-handle--midi",
    indicatorToneClass: "io-indicator--midi",
    labelToneClass: "io-label--midi",
  };
};

export default function AudioNode(props: NodeProps) {
  const { id, selected } = props;
  const audioModule = useAudioModule(id);
  if (!audioModule) return null;

  const { inputs, outputs, ...audioModuleProps } = audioModule;

  return (
    <Dialog>
      <div className={getNodeContainerClassName(selected)}>
        {inputs.length > 0 && (
          <IOContainer type="input">
            {inputs.map((io) => (
              <IO key={io.id} io={io} />
            ))}
          </IOContainer>
        )}

        <Stack gap={2} className="relative justify-center p-3">
          <Stack direction="row" align="center" gap={2} className="pr-7">
            <div className="h-2 w-2 rounded-full bg-brand" />
            <Text asChild size="sm" weight="medium" className="truncate">
              <span>{audioModule.name || audioModule.moduleType}</span>
            </Text>

            <DialogTrigger asChild>
              <IconButton
                aria-label="Open module settings"
                size="xs"
                variant="text"
                color="neutral"
                icon={<Settings className="h-3 w-3" />}
                className="absolute right-1 top-1"
              />
            </DialogTrigger>
          </Stack>
          <AudioModule audioModule={audioModuleProps} />
        </Stack>

        {outputs.length > 0 && (
          <IOContainer type="output">
            {outputs.map((io) => (
              <IO key={io.id} io={io} />
            ))}
          </IOContainer>
        )}
      </div>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Module Settings</DialogTitle>
          <DialogDescription>
            Configure name and voice settings for this module.
          </DialogDescription>
        </DialogHeader>
        <Stack gap={3}>
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
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function IO({ io }: { io: IIOSerialize }) {
  const handleProps = useMemo(() => {
    const isInput = io.ioType.includes("Input");
    const position = isInput ? Position.Left : Position.Right;
    const type: HandleType = isInput ? "target" : "source";
    const className = isInput ? "-left-[8px]" : "-right-[8px]";
    const { handleToneClass, indicatorToneClass, labelToneClass } =
      getIOToneClasses(io.ioType);

    return {
      type,
      position,
      className,
      handleToneClass,
      indicatorToneClass,
      labelToneClass,
      isInput,
    };
  }, [io.ioType]);

  return (
    <div className="group/io relative flex items-center">
      <Text
        asChild
        size="xs"
        weight="medium"
        className={`w-full truncate px-3 py-2 ${handleProps.labelToneClass} ${handleProps.isInput ? "text-left" : "text-right"}`}
      >
        <div>{io.name}</div>
      </Text>
      <Handle
        id={io.name}
        type={handleProps.type}
        position={handleProps.position}
        className={`${handleProps.className} io-handle ${handleProps.handleToneClass} h-4 w-4 cursor-pointer rounded-full border-2 border-surface-raised shadow-lg transition-all duration-200 hover:scale-110`}
      />

      {/* Connection indicator dot */}
      <div
        className={`absolute ${handleProps.isInput ? "-left-1" : "-right-1"} io-indicator ${handleProps.indicatorToneClass} top-1/2 transform -translate-y-1/2 w-1 h-1 opacity-60 group-hover/io:opacity-100 transition-opacity duration-200`}
      />
    </div>
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
    <Surface
      tone="panel"
      radius="none"
      className={`flex min-w-[80px] flex-col justify-center ${isInput ? "rounded-l-lg" : "rounded-r-lg"}`}
    >
      <div className="flex flex-col py-2">{children}</div>
    </Surface>
  );
}
