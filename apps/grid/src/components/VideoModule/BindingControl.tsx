import type { NumberProp } from "@blibliki/engine";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  IconButton,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from "@blibliki/ui";
import { uuidv4 } from "@blibliki/utils";
import { Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import { modulesSelector } from "@/components/AudioModule/modulesSlice";
import { useAppDispatch, useAppSelector } from "@/hooks";
import {
  bindableControls,
  controlLabel,
  plugKey,
} from "@/video/bindableControls";
import {
  addVideoRoute,
  removeVideoRoute,
  selectControlRoute,
} from "@/video/videoPatchSlice";

type Props = { moduleId: string; prop: string; schema: NumberProp };

const RANGE_KEYS = ["inMin", "inMax", "outMin", "outMax"] as const;

// ponytail: one control route per prop here; the engine already adds several,
// a list with add and remove when a second source is wanted.
// ponytail: slider shows the stored value; a per-frame values message from
// the worker if following the live value matters
export default function BindingControl({ moduleId, prop, schema }: Props) {
  const dispatch = useAppDispatch();
  const id = `${moduleId}:${prop}`;
  const route = useAppSelector((state) =>
    selectControlRoute(state, moduleId, prop),
  );
  const audioModules = useAppSelector(modulesSelector.selectAll);
  const videoModules = useAppSelector((state) => state.videoPatch.modules);
  const controls = useMemo(
    () => bindableControls(videoModules, audioModules, moduleId),
    [videoModules, audioModules, moduleId],
  );

  const [source, setSource] = useState(route ? plugKey(route.source) : "");
  const [exp, setExp] = useState(route?.exp);
  const [range, setRange] = useState({
    inMin: route?.inMin ?? 0,
    inMax: route?.inMax ?? 1,
    outMin: route?.outMin ?? schema.min,
    outMax: route?.outMax ?? schema.max,
  });

  const choose = (next: string) => {
    const chosen = controls.find((c) => plugKey(c.source) === next);
    setSource(next);
    if (chosen) {
      setRange((r) => ({ ...r, inMin: chosen.min, inMax: chosen.max }));
      setExp(chosen.exp);
    }
  };

  const save = () => {
    const chosen = controls.find((c) => plugKey(c.source) === source);
    if (!chosen) return;
    dispatch(
      addVideoRoute({
        id: route?.id ?? uuidv4(),
        kind: "control",
        source: chosen.source,
        destination: { moduleId, ioName: prop },
        exp,
        ...range,
      }),
    );
  };

  const unlink = () => {
    if (route) dispatch(removeVideoRoute(route.id));
    setSource("");
  };

  return (
    <Stack direction="row" align="center" gap={1}>
      {route && (
        <Text size="xs" tone="muted" className="truncate">
          {controlLabel(controls, route.source)}
        </Text>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <IconButton
            aria-label={`Bind ${schema.label}`}
            size="xs"
            variant="text"
            color={route ? "primary" : "neutral"}
            icon={<Link2 className="h-3 w-3" />}
          />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bind {schema.label}</DialogTitle>
            <DialogDescription>
              Follow the output of a control module, such as an Audio Prop.
            </DialogDescription>
          </DialogHeader>
          <Stack gap={3}>
            <Select value={source} onValueChange={choose}>
              <SelectTrigger aria-label="Control">
                <SelectValue placeholder="Choose a control" />
              </SelectTrigger>
              <SelectContent>
                {controls.map((c) => (
                  <SelectItem key={plugKey(c.source)} value={plugKey(c.source)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Stack direction="row" gap={2}>
              {RANGE_KEYS.map((key) => (
                <Stack key={key} gap={1}>
                  <Label htmlFor={`${id}-${key}`}>{key}</Label>
                  <Input
                    id={`${id}-${key}`}
                    type="number"
                    value={range[key]}
                    onChange={(event) => {
                      setRange((r) => ({
                        ...r,
                        [key]: Number(event.target.value),
                      }));
                    }}
                  />
                </Stack>
              ))}
            </Stack>
            <Stack direction="row" gap={2}>
              <Button color="primary" onClick={save} disabled={!source}>
                Save
              </Button>
              {route && (
                <Button variant="text" color="neutral" onClick={unlink}>
                  Unlink
                </Button>
              )}
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
