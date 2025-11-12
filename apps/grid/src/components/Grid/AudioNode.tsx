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
      <ContextMenuTrigger className="flex cursor-grab items-stretch shadow-lg hover:shadow-xl transition-shadow duration-200 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 min-w-[200px]">
        {inputs.length > 0 && (
          <IOContainer type="input">
            {inputs.map((io) => (
              <IO key={io.id} io={io} />
            ))}
          </IOContainer>
        )}

        <div className={"flex flex-col justify-center p-3 gap-2"}>
          <div className="flex items-center gap-2 ">
            <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full" />
            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {audioModule.name || audioModule.moduleType}
            </span>
          </div>
          <AudioModule audioModule={audioModuleProps} />
        </div>

        {outputs.length > 0 && (
          <IOContainer type="output">
            {outputs.map((io) => (
              <IO key={io.id} io={io} />
            ))}
          </IOContainer>
        )}
      </ContextMenuTrigger>

      <ContextMenuContent className="p-0 border-0">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 space-y-3">
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
    const isInput = io.ioType.includes("Input");
    const position = isInput ? Position.Left : Position.Right;
    const type: HandleType = isInput ? "target" : "source";
    const className = isInput ? "-left-[8px]" : "-right-[8px]";
    const gradientClass = isInput
      ? "bg-gradient-to-r from-emerald-500 to-teal-600"
      : "bg-gradient-to-r from-orange-500 to-red-600";

    return { type, position, className, gradientClass, isInput };
  }, [io.ioType]);

  return (
    <div className="group/io relative flex items-center">
      <div
        className={`px-3 py-2 w-full text-xs font-medium text-slate-700 dark:text-slate-200 truncate ${handleProps.isInput ? "text-left" : "text-right"}`}
      >
        {io.name}
      </div>
      <Handle
        id={io.name}
        type={handleProps.type}
        position={handleProps.position}
        className={`${handleProps.className} ${handleProps.gradientClass} w-4 h-4 rounded-full border-2 border-white dark:border-slate-700 shadow-lg hover:scale-110 transition-all duration-200 cursor-pointer`}
      />

      {/* Connection indicator dot */}
      <div
        className={`absolute ${handleProps.isInput ? "-left-1" : "-right-1"} top-1/2 transform -translate-y-1/2 w-1 h-1 ${handleProps.gradientClass} rounded-full opacity-60 group-hover/io:opacity-100 transition-opacity duration-200`}
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
  const bgColor = "bg-slate-50 dark:bg-slate-800/50";

  return (
    <div
      className={`flex flex-col justify-center min-w-[80px] ${bgColor} ${isInput ? "rounded-l-lg" : "rounded-r-lg"}`}
    >
      <div className="flex flex-col py-2">{children}</div>
    </div>
  );
}
