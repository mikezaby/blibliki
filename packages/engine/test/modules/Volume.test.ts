import { dbToGain } from "@blibliki/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { Module } from "@/core/module/Module";
import { moduleSchemas, ModuleType } from "@/modules";
import { MonoVolume } from "@/modules/Volume";

describe("Volume", () => {
  let volume: MonoVolume;

  beforeEach((ctx) => {
    volume = Module.create(MonoVolume, ctx.engine.id, {
      name: "volume",
      moduleType: ModuleType.Volume,
      props: { volume: 0 },
    });
  });

  it("uses default props and one voice when added without Grid defaults", (ctx) => {
    const serialized = ctx.engine.addModule({
      name: "dropped volume",
      moduleType: ModuleType.Volume,
      props: {},
    });

    expect(serialized.props).toEqual({ volume: 0 });
    expect("voices" in serialized && serialized.voices).toBe(1);
  });

  it("defines the dB fader range and curve in the schema", () => {
    expect(moduleSchemas[ModuleType.Volume].volume).toMatchObject({
      min: -60,
      max: 6,
      step: 0.1,
      exp: 0.33,
    });
  });

  it("uses unity gain at 0 dB", () => {
    expect(volume.audioNode.gain.value).toBe(1);
  });

  it.each([-24, -6, 6])("converts %s dB to linear gain", (value) => {
    volume.props = { volume: value };

    expect(volume.audioNode.gain.value).toBeCloseTo(dbToGain(value));
  });

  it("mutes at -60 dB", () => {
    volume.props = { volume: -60 };

    expect(volume.audioNode.gain.value).toBe(0);
  });

  it.each([
    { value: -80, expected: -60 },
    { value: 12, expected: 6 },
  ])("clamps $value dB to $expected dB", ({ value, expected }) => {
    volume.props = { volume: value };

    expect(volume.props.volume).toBe(expected);
  });

  it("initializes the GainNode before deferred setter hooks run", (ctx) => {
    const initializedVolume = Module.create(MonoVolume, ctx.engine.id, {
      name: "initialized volume",
      moduleType: ModuleType.Volume,
      props: { volume: -12 },
    });

    expect(initializedVolume.audioNode.gain.value).toBeCloseTo(dbToGain(-12));
  });

  it("serializes volume in dB", () => {
    volume.props = { volume: -18 };

    expect(volume.serialize().props).toEqual({ volume: -18 });
  });
});
