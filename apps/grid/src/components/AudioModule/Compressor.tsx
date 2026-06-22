import {
  Engine,
  ModuleType,
  ModuleTypeToPropsMapping,
  moduleSchemas,
} from "@blibliki/engine";
import { Fader, type MarkProps, Stack, Surface, Text } from "@blibliki/ui";
import { requestAnimationFrame } from "@blibliki/utils";
import { useEffect, useState } from "react";
import { ModuleComponent } from ".";
import Container from "./Container";

const MIX_MARKS: MarkProps[] = [
  { value: 0, label: "Dry" },
  { value: 0.5, label: "50%" },
  { value: 1, label: "Wet" },
];

const MAX_REDUCTION_DB = 60;

const Compressor: ModuleComponent<ModuleType.Compressor> = (props) => {
  const {
    id,
    updateProp,
    props: { threshold, ratio, knee, attack, release, makeup, mix },
  } = props;
  const schema = moduleSchemas[ModuleType.Compressor];
  const [reduction, setReduction] = useState(0);

  useEffect(() => {
    let running = true;

    const updateReduction = () => {
      if (!running) return;

      const module = Engine.current.findModule(id);
      if (module.moduleType !== ModuleType.Compressor) {
        throw Error("Not a compressor module");
      }

      setReduction(module.getReduction());
      requestAnimationFrame(updateReduction);
    };

    updateReduction();

    return () => {
      running = false;
    };
  }, [id]);

  const onChange = (
    prop: keyof ModuleTypeToPropsMapping[ModuleType.Compressor],
  ) => {
    const update = updateProp(prop);

    return (_: number, calculatedValue: number) => {
      update(calculatedValue);
    };
  };

  const reductionAmount = Math.min(MAX_REDUCTION_DB, Math.max(0, -reduction));

  return (
    <Stack gap={4}>
      <Container className="flex-wrap gap-y-6">
        <Fader
          name="Threshold"
          min={schema.threshold.min}
          max={schema.threshold.max}
          step={schema.threshold.step}
          value={threshold}
          onChange={onChange("threshold")}
        />
        <Fader
          name="Ratio"
          min={schema.ratio.min}
          max={schema.ratio.max}
          step={schema.ratio.step}
          value={ratio}
          onChange={onChange("ratio")}
        />
        <Fader
          name="Knee"
          min={schema.knee.min}
          max={schema.knee.max}
          step={schema.knee.step}
          value={knee}
          onChange={onChange("knee")}
        />
        <Fader
          name="Attack"
          min={schema.attack.min}
          max={schema.attack.max}
          step={schema.attack.step}
          value={attack}
          onChange={onChange("attack")}
        />
        <Fader
          name="Release"
          min={schema.release.min}
          max={schema.release.max}
          step={schema.release.step}
          value={release}
          onChange={onChange("release")}
        />
        <Fader
          name="Makeup"
          min={schema.makeup.min}
          max={schema.makeup.max}
          step={schema.makeup.step}
          value={makeup}
          onChange={onChange("makeup")}
        />
        <Fader
          name="Mix"
          marks={MIX_MARKS}
          min={schema.mix.min}
          max={schema.mix.max}
          step={schema.mix.step}
          value={mix}
          onChange={onChange("mix")}
        />
      </Container>

      <Surface tone="subtle" border="subtle" radius="md" className="p-3">
        <Stack gap={2}>
          <Stack direction="row" align="center" justify="between">
            <Text size="xs" tone="muted">
              Gain reduction
            </Text>
            <Text size="xs">{`${reduction.toFixed(1)} dB`}</Text>
          </Stack>
          <div
            role="meter"
            aria-label="Gain reduction"
            aria-valuemin={0}
            aria-valuemax={MAX_REDUCTION_DB}
            aria-valuenow={reductionAmount}
            className="h-2 overflow-hidden rounded-full bg-surface-canvas"
          >
            <div
              className="h-full bg-brand"
              style={{
                width: `${(reductionAmount / MAX_REDUCTION_DB) * 100}%`,
              }}
            />
          </div>
        </Stack>
      </Surface>
    </Stack>
  );
};

export default Compressor;
