import { IIOSerialize } from "@blibliki/engine";
import { Handle, HandleType, NodeProps, Position } from "@xyflow/react";
import { ReactNode, useMemo } from "react";
import AudioModule from "@/components/AudioModule";
import { useAudioModule } from "@/hooks";
import Name from "../AudioModule/attributes/Name";
import Voices from "../AudioModule/attributes/Voices";
import {
  Card,
  CardContent,
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "../ui";

export const NodeTypes = {
  audioNode: AudioNode,
};

export default function AudioNode(props: NodeProps) {
  const { id } = props;
  const audioModule = useAudioModule(id);
  if (!audioModule) return null;

  const { inputs, outputs, ...audioModuleProps } = audioModule;

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex cursor-grab gap-3 items-stretch shadow-md rounded-md bg-white dark:bg-gray-800 border-2 border-stone-400">
        <IOContainer>
          {inputs.map((io) => (
            <IO key={io.id} io={io} />
          ))}
        </IOContainer>

        <div className="py-2">
          <AudioModule audioModule={audioModuleProps} />
        </div>

        <IOContainer>
          {outputs.map((io) => (
            <IO key={io.id} io={io} />
          ))}
        </IOContainer>
      </ContextMenuTrigger>

      <ContextMenuContent className="p-0 border-0">
        <Card>
          <CardContent>
            <Name
              id={audioModule.id}
              moduleType={audioModule.moduleType}
              value={audioModule.name}
            />
            {audioModule.voices && (
              <Voices
                id={audioModule.id}
                moduleType={audioModule.moduleType}
                value={audioModule.voices}
              />
            )}
          </CardContent>
        </Card>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function IO({ io }: { io: IIOSerialize }) {
  const handleProps = useMemo(() => {
    const position = io.ioType.includes("Input")
      ? Position.Left
      : Position.Right;
    const type: HandleType = io.ioType.includes("Input") ? "target" : "source";
    const className = io.ioType.includes("Input")
      ? "-left-[6px]"
      : "-right-[6px]";

    return { type, position, className };
  }, [io.ioType]);

  return (
    <div className="relative">
      <div className="px-2">{io.name}</div>
      <Handle
        id={io.name}
        type={handleProps.type}
        position={handleProps.position}
        className={`${handleProps.className} block rounded w-auto h-6 text-white text-xs -bottom-5 p-1`}
      />
    </div>
  );
}

function IOContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 justify-center bg-gray-100 dark:bg-gray-700">
      {children}
    </div>
  );
}
