import { describe, expect, it } from "vitest";
import { ModuleType } from "@/modules";
import { waitForCondition } from "../utils/waitForCondition";

describe("Engine.updateModule", () => {
  it("fires onPropsUpdate for a prop changed through updateModule", async (ctx) => {
    const seen: number[] = [];
    ctx.engine.onPropsUpdate((update) => {
      seen.push((update.props as { gain: number }).gain);
    });
    ctx.engine.addModule({
      name: "Gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });
    // Construction reports its own props once; consume that first.
    await waitForCondition(() => seen.length > 0);
    const gainId = Array.from(ctx.engine.modules.keys())[0]!;

    ctx.engine.updateModule({
      id: gainId,
      moduleType: ModuleType.Gain,
      changes: { props: { gain: 0.25 } },
    });

    await waitForCondition(() => seen.includes(0.25));
    expect(seen).toContain(0.25);
  });
});
