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
  Stack,
  Text,
} from "@blibliki/ui";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { updateVideoRoute } from "@/video/videoPatchSlice";
import { useOutputValue } from "@/video/videoValues";

const RANGE_KEYS = ["inMin", "inMax", "outMin", "outMax", "exp"] as const;
type RangeKey = (typeof RANGE_KEYS)[number];

const text = (value?: number) => value?.toString() ?? "";

// A control route's cable, with a button at its middle that opens the
// range editor: source range in, prop range out, and the source's curve.
export default function ControlEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={
          selected ? "control-edge control-edge--selected" : "control-edge"
        }
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <Stack direction="row" align="center" gap={1}>
            <Readout routeId={id} />
            <RangeEditor routeId={id} />
          </Stack>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// The source's current value, so a silent Band or a stuck LFO shows.
function Readout({ routeId }: { routeId: string }) {
  const source = useAppSelector(
    (state) => state.videoPatch.routes.find((r) => r.id === routeId)?.source,
  );
  const value = useOutputValue(source?.moduleId ?? "", source?.ioName ?? "");
  if (value === undefined) return null;

  return (
    <Text asChild size="sm" className="font-mono tabular-nums">
      <span>{value.toFixed(2)}</span>
    </Text>
  );
}

function RangeEditor({ routeId }: { routeId: string }) {
  const dispatch = useAppDispatch();
  const route = useAppSelector((state) =>
    state.videoPatch.routes.find((r) => r.id === routeId),
  );
  const [draft, setDraft] = useState<Record<RangeKey, string>>(() => ({
    inMin: text(route?.inMin),
    inMax: text(route?.inMax),
    outMin: text(route?.outMin),
    outMax: text(route?.outMax),
    exp: text(route?.exp),
  }));
  if (!route) return null;

  const save = () => {
    const changes = Object.fromEntries(
      RANGE_KEYS.map((key) => {
        const value = Number(draft[key]);
        return [
          key,
          draft[key] === "" || Number.isNaN(value) ? undefined : value,
        ];
      }),
    );
    dispatch(updateVideoRoute({ id: routeId, changes }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <IconButton
          aria-label="Edit control range"
          size="xs"
          variant="contained"
          color="neutral"
          icon={<SlidersHorizontal className="h-3 w-3" />}
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Control range</DialogTitle>
          <DialogDescription>
            Map the source's in range onto the prop's out range. Exp is the
            source's slider curve; leave it empty for linear.
          </DialogDescription>
        </DialogHeader>
        <Stack gap={3}>
          <Stack direction="row" gap={2}>
            {RANGE_KEYS.map((key) => (
              <Stack key={key} gap={1}>
                <Label htmlFor={`${routeId}-${key}`}>{key}</Label>
                <Input
                  id={`${routeId}-${key}`}
                  type="number"
                  value={draft[key]}
                  onChange={(event) => {
                    setDraft((d) => ({ ...d, [key]: event.target.value }));
                  }}
                />
              </Stack>
            ))}
          </Stack>
          <Button color="primary" onClick={save}>
            Save
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
