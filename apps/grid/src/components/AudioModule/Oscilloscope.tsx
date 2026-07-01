import { Engine, moduleSchemas, ModuleType } from "@blibliki/engine";
import { Stack, Surface } from "@blibliki/ui";
import { oscilloscope, requestAnimationFrame } from "@blibliki/utils";
import { useEffect, useRef } from "react";
import { ModuleComponent } from ".";
import { SelectField } from "./attributes/Field";

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 160;

const Oscilloscope: ModuleComponent<ModuleType.Oscilloscope> = (props) => {
  const {
    id,
    updateProp,
    props: { fftSize },
  } = props;

  const fftSchema = moduleSchemas[ModuleType.Oscilloscope].fftSize;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let running = true;

    function draw() {
      const module = Engine.current.findModule(id);
      if (module.moduleType !== ModuleType.Oscilloscope)
        throw Error("Not an oscilloscope module");

      if (!running) return;
      if (!canvasRef.current) {
        requestAnimationFrame(draw);
        return;
      }

      oscilloscope({
        canvas: canvasRef.current,
        buffer: module.getValues(),
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        cyclesToShow: 3,
        color: "#22d3ee",
      });

      requestAnimationFrame(draw);
    }

    draw();
    return () => {
      running = false;
    };
  }, [id, fftSize]);

  return (
    <Stack gap={4}>
      <SelectField
        value={fftSize}
        schema={fftSchema}
        onChange={updateProp("fftSize")}
        className="w-28"
      />
      <Surface tone="panel" border="subtle" radius="md" className="w-fit p-1">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="h-[160px] w-[360px] rounded"
        />
      </Surface>
    </Stack>
  );
};

export default Oscilloscope;
