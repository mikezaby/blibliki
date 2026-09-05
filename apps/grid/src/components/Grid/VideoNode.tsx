import { Stack, Text } from "@blibliki/ui";
import {
  inputsFor,
  videoModuleSchemas,
  VideoModuleType,
} from "@blibliki/video-engine";
import type { NodeProps } from "@xyflow/react";
import VideoField from "@/components/VideoModule/VideoField";
import VisualsBody from "@/components/VideoModule/VisualsBody";
import { useAppSelector } from "@/hooks";
import { selectVideoModule } from "@/video/videoPatchSlice";
import { getNodeContainerClassName, IO, IOContainer } from "./AudioNode";

export default function VideoNode({ id, selected }: NodeProps) {
  const module = useAppSelector((state) => selectVideoModule(state, id));
  if (!module) return null;

  const inputs = inputsFor(module.moduleType);
  const isOutput = module.moduleType === VideoModuleType.Output;
  const schema = videoModuleSchemas[module.moduleType];
  const props = module.props as Record<string, unknown>;

  return (
    <div className={getNodeContainerClassName(selected)}>
      {inputs.length > 0 && (
        <IOContainer type="input">
          {inputs.map((name) => (
            <IO key={name} io={{ name, ioType: "TextureInput" }} />
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
        {isOutput ? (
          <VisualsBody id={module.id} />
        ) : (
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
        )}
      </Stack>

      {!isOutput && (
        <IOContainer type="output">
          <IO io={{ name: "out", ioType: "TextureOutput" }} />
        </IOContainer>
      )}
    </div>
  );
}
