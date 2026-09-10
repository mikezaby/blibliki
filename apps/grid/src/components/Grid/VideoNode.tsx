import { Stack, Text } from "@blibliki/ui";
import {
  inputsFor,
  type IOPort,
  outputsFor,
  videoModuleSchemas,
  VideoModuleType,
} from "@blibliki/video-engine";
import type { NodeProps } from "@xyflow/react";
import AudioPropBody from "@/components/VideoModule/AudioPropBody";
import VideoField from "@/components/VideoModule/VideoField";
import VisualsBody from "@/components/VideoModule/VisualsBody";
import { useAppSelector } from "@/hooks";
import { selectVideoModule } from "@/video/videoPatchSlice";
import { getNodeContainerClassName, IO, IOContainer } from "./AudioNode";

// Handle tone follows the port kind, as audio nodes do with AudioInput and
// MidiInput.
const TONES = { texture: "Texture", control: "Control", midi: "Midi" } as const;

const ioType = (port: IOPort, side: "Input" | "Output") =>
  `${TONES[port.kind]}${side}`;

export default function VideoNode({ id, selected }: NodeProps) {
  const module = useAppSelector((state) => selectVideoModule(state, id));
  if (!module) return null;

  const inputs = inputsFor(module.moduleType);
  const outputs = outputsFor(module.moduleType);
  const schema = videoModuleSchemas[module.moduleType];
  const props = module.props as Record<string, unknown>;

  const body = () => {
    switch (module.moduleType) {
      case VideoModuleType.Output:
        return <VisualsBody id={module.id} />;
      case VideoModuleType.AudioProp:
        return (
          <AudioPropBody
            id={module.id}
            moduleId={props.moduleId as string}
            prop={props.prop as string}
          />
        );
      default:
        return (
          <Stack direction="row" gap={2} className="flex-wrap">
            {Object.entries(schema).map(([prop, propSchema]) => (
              <VideoField
                key={prop}
                moduleId={module.id}
                prop={prop}
                schema={propSchema}
                value={props[prop]}
              />
            ))}
          </Stack>
        );
    }
  };

  return (
    <div className={getNodeContainerClassName(selected)}>
      {inputs.length > 0 && (
        <IOContainer type="input">
          {inputs.map((port) => (
            <IO
              key={port.name}
              io={{ name: port.name, ioType: ioType(port, "Input") }}
            />
          ))}
        </IOContainer>
      )}

      <Stack gap={2} className="relative justify-center p-3">
        <Stack direction="row" align="center" gap={2}>
          <div className="io-indicator--texture h-2 w-2 rounded-full" />
          <Text asChild size="sm" weight="medium" className="truncate">
            <span>{module.name}</span>
          </Text>
        </Stack>
        {body()}
      </Stack>

      {outputs.length > 0 && (
        <IOContainer type="output">
          {outputs.map((port) => (
            <IO
              key={port.name}
              io={{ name: port.name, ioType: ioType(port, "Output") }}
            />
          ))}
        </IOContainer>
      )}
    </div>
  );
}
