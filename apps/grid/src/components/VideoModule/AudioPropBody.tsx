import { moduleSchemas, type PropSchema } from "@blibliki/engine";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
} from "@blibliki/ui";
import { modulesSelector } from "@/components/AudioModule/modulesSlice";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { updateVideoModuleProps } from "@/video/videoPatchSlice";

type Props = { id: string; moduleId: string; prop: string };

// Picks an audio module and one of its numeric props to mirror.
export default function AudioPropBody({ id, moduleId, prop }: Props) {
  const dispatch = useAppDispatch();
  const audioModules = useAppSelector(modulesSelector.selectAll);
  const chosen = audioModules.find((m) => m.id === moduleId);
  const props = chosen
    ? Object.entries(
        moduleSchemas[chosen.moduleType] as Record<string, PropSchema>,
      ).filter(([, schema]) => schema.kind === "number")
    : [];

  return (
    <Stack gap={2} className="min-w-40">
      <Select
        value={moduleId}
        onValueChange={(next) => {
          dispatch(
            updateVideoModuleProps({ id, props: { moduleId: next, prop: "" } }),
          );
        }}
      >
        <SelectTrigger aria-label="Audio module">
          <SelectValue placeholder="Audio module" />
        </SelectTrigger>
        <SelectContent>
          {audioModules.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={prop}
        disabled={!chosen}
        onValueChange={(next) => {
          dispatch(updateVideoModuleProps({ id, props: { prop: next } }));
        }}
      >
        <SelectTrigger aria-label="Audio prop">
          <SelectValue placeholder="Prop" />
        </SelectTrigger>
        <SelectContent>
          {props.map(([key, schema]) => (
            <SelectItem key={key} value={key}>
              {schema.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Stack>
  );
}
