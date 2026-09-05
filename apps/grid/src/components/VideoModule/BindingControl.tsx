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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from "@blibliki/ui";
import { Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import { modulesSelector } from "@/components/AudioModule/modulesSlice";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { bindableControls, controlLabel } from "@/video/bindableControls";
import { removeVideoBinding, setVideoBinding } from "@/video/videoPatchSlice";

type Props = { moduleId: string; prop: string; schema: NumberProp };

const RANGE_KEYS = ["inMin", "inMax", "outMin", "outMax"] as const;
const GROUPS = ["Spectrum", "Audio"] as const;

// ponytail: slider shows the stored value; a per-frame values message from
// the worker if following the live value matters
export default function BindingControl({ moduleId, prop, schema }: Props) {
  const dispatch = useAppDispatch();
  const id = `${moduleId}:${prop}`;
  const binding = useAppSelector((state) =>
    state.videoPatch.bindings.find((b) => b.id === id),
  );
  const audioModules = useAppSelector(modulesSelector.selectAll);
  const controls = useMemo(
    () => bindableControls(audioModules),
    [audioModules],
  );

  const [control, setControl] = useState(binding?.control ?? "");
  const [exp, setExp] = useState(binding?.exp);
  const [range, setRange] = useState({
    inMin: binding?.inMin ?? 0,
    inMax: binding?.inMax ?? 1,
    outMin: binding?.outMin ?? schema.min,
    outMax: binding?.outMax ?? schema.max,
  });

  const choose = (next: string) => {
    const chosen = controls.find((c) => c.control === next);
    setControl(next);
    if (chosen) {
      setRange((r) => ({ ...r, inMin: chosen.min, inMax: chosen.max }));
      setExp(chosen.exp);
    }
  };

  const save = () => {
    if (!control) return;
    dispatch(setVideoBinding({ id, moduleId, prop, control, exp, ...range }));
  };

  const unlink = () => {
    dispatch(removeVideoBinding(id));
    setControl("");
  };

  return (
    <Stack direction="row" align="center" gap={1}>
      {binding && (
        <Text size="xs" tone="muted" className="truncate">
          {controlLabel(controls, binding.control)}
        </Text>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <IconButton
            aria-label={`Bind ${schema.label}`}
            size="xs"
            variant="text"
            color={binding ? "primary" : "neutral"}
            icon={<Link2 className="h-3 w-3" />}
          />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bind {schema.label}</DialogTitle>
            <DialogDescription>
              Follow a spectrum band or an audio module prop.
            </DialogDescription>
          </DialogHeader>
          <Stack gap={3}>
            <Select value={control} onValueChange={choose}>
              <SelectTrigger aria-label="Control">
                <SelectValue placeholder="Choose a control" />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map((group) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {controls
                      .filter((c) => c.group === group)
                      .map((c) => (
                        <SelectItem key={c.control} value={c.control}>
                          {c.label}
                        </SelectItem>
                      ))}
                  </SelectGroup>
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
              <Button color="primary" onClick={save} disabled={!control}>
                Save
              </Button>
              {binding && (
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
