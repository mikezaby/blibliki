import { beforeEach, describe, expect, it } from "vitest";
import type MidiInputDevice from "@/core/midi/MidiInputDevice";
import type MidiOutputDevice from "@/core/midi/MidiOutputDevice";
import {
  type ControllerMatcherDefinition,
  type MatchedControllerPorts,
  ControllerMatcherRegistry,
} from "@/core/midi/controllers/ControllerMatcher";

type CreatedController = {
  engineId: string;
  inputId: string;
  outputId: string;
};

class TestController {
  static created: CreatedController[] = [];
  static disposed: string[] = [];

  readonly ports: MatchedControllerPorts;

  constructor(engineId: string, ports: MatchedControllerPorts) {
    this.ports = ports;
    TestController.created.push({
      engineId,
      inputId: ports.input.id,
      outputId: ports.output.id,
    });
  }

  dispose() {
    TestController.disposed.push(
      `${this.ports.input.id}:${this.ports.output.id}`,
    );
  }
}

const createMatcher = (
  overrides: Partial<ControllerMatcherDefinition> = {},
): ControllerMatcherDefinition => ({
  id: "launch-control-xl3",
  klass: TestController,
  inputCandidateNames: ["LCXL3 DAW"],
  outputCandidateNames: ["LCXL3 DAW"],
  minScore: 0.6,
  maxInstances: 1,
  ...overrides,
});

const input = (id: string, name: string) =>
  ({ id, name }) as unknown as MidiInputDevice;
const output = (id: string, name: string) =>
  ({ id, name }) as unknown as MidiOutputDevice;

describe("ControllerMatcherRegistry", () => {
  beforeEach(() => {
    TestController.created = [];
    TestController.disposed = [];
  });

  it("creates a controller only when both input and output match", () => {
    const registry = new ControllerMatcherRegistry("engine-1", [
      createMatcher(),
    ]);

    registry.reconcile(
      [input("in-1", "LCXL3 DAW Input")],
      [output("out-1", "LCXL3 DAW Output")],
    );

    expect(TestController.created).toEqual([
      {
        engineId: "engine-1",
        inputId: "in-1",
        outputId: "out-1",
      },
    ]);
  });

  it("does not create controller when only one side matches", () => {
    const registry = new ControllerMatcherRegistry("engine-1", [
      createMatcher(),
    ]);

    registry.reconcile([input("in-1", "LCXL3 DAW Input")], []);
    expect(TestController.created).toHaveLength(0);

    registry.reconcile([], [output("out-1", "LCXL3 DAW Output")]);
    expect(TestController.created).toHaveLength(0);
  });

  it("reuses existing binding on repeated reconcile with same pair", () => {
    const registry = new ControllerMatcherRegistry("engine-1", [
      createMatcher(),
    ]);
    const inputs = [input("in-1", "LCXL3 DAW Input")];
    const outputs = [output("out-1", "LCXL3 DAW Output")];

    registry.reconcile(inputs, outputs);
    registry.reconcile(inputs, outputs);

    expect(TestController.created).toHaveLength(1);
    expect(TestController.disposed).toHaveLength(0);
  });

  it("disposes old controller and creates a new one when pair changes", () => {
    const registry = new ControllerMatcherRegistry("engine-1", [
      createMatcher(),
    ]);

    registry.reconcile(
      [input("in-1", "LCXL3 DAW Input A")],
      [output("out-1", "LCXL3 DAW Output A")],
    );
    registry.reconcile(
      [input("in-2", "LCXL3 DAW Input B")],
      [output("out-2", "LCXL3 DAW Output B")],
    );

    expect(TestController.created).toHaveLength(2);
    expect(TestController.disposed).toEqual(["in-1:out-1"]);
  });

  it("respects one-instance policy even with multiple matchable pairs", () => {
    const registry = new ControllerMatcherRegistry("engine-1", [
      createMatcher({ minScore: 0, maxInstances: 1 }),
    ]);

    registry.reconcile(
      [input("in-1", "LCXL3 DAW"), input("in-2", "Something Else")],
      [output("out-1", "LCXL3 DAW"), output("out-2", "Another Port")],
    );

    expect(TestController.created).toHaveLength(1);
    expect(TestController.created[0]).toEqual({
      engineId: "engine-1",
      inputId: "in-1",
      outputId: "out-1",
    });
  });
});
