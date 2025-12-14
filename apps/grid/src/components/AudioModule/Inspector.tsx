import { Engine, moduleSchemas, ModuleType } from "@blibliki/engine";
import { oscilloscope, requestAnimationFrame } from "@blibliki/utils";
import { useEffect, useRef } from "react";
import { ModuleComponent } from ".";
import Container from "./Container";
import { SelectField } from "./attributes/Field";

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 160;

const Inspector: ModuleComponent<ModuleType.Inspector> = (props) => {
  const {
    id,
    updateProp,
    props: { fftSize },
  } = props;

  const fftSchema = moduleSchemas[ModuleType.Inspector].fftSize;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let running = true;

    function draw() {
      const module = Engine.current.findModule(id);
      if (module.moduleType !== ModuleType.Inspector)
        throw Error("Not an inspector module");

      if (!running) return;
      if (!canvasRef.current) {
        requestAnimationFrame(draw);
        return;
      }

      const buffer = module.getValues();

      oscilloscope({
        canvas: canvasRef.current,
        buffer,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        cyclesToShow: 3, // Always show 3 cycles if possible
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
    <Container className="flex flex-col gap-4">
      <SelectField
        name="fftSize"
        value={fftSize}
        schema={fftSchema}
        onChange={updateProp("fftSize")}
        className="w-28"
      />
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded bg-background border"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      />
    </Container>
  );
};

export default Inspector;
