import { describe, expect, it } from "vitest";
import { createFaceplateFit } from "@/react/faceplateFit";

describe("createFaceplateFit", () => {
  const DESIGN_WIDTH = 1536;

  it("shrinks to whichever axis runs out first", () => {
    // A phone in landscape: height is the tight one.
    expect(createFaceplateFit(852, 393, 900).scale).toBeCloseTo(393 / 900);
    // A short, very wide stage: width still has room, height does not.
    expect(createFaceplateFit(3840, 600, 900).scale).toBeCloseTo(600 / 900);
  });

  it("grows so the console fills a stage larger than the design", () => {
    // Width is the tight axis here: 2x the design width against 2000/900.
    expect(createFaceplateFit(DESIGN_WIDTH * 2, 2000, 900).scale).toBe(2);
  });

  it("centres the scaled faceplate on both axes", () => {
    const stageWidth = 400;
    const stageHeight = 300;
    const fit = createFaceplateFit(stageWidth, stageHeight, 900);

    // Scaled width exactly fills the stage, so there is nothing left to offset.
    expect(fit.scale).toBeCloseTo(400 / 1536);
    expect(fit.x).toBeCloseTo(0);
    // Height has room to spare, so the leftover is split evenly.
    expect(fit.y).toBeCloseTo((stageHeight - 900 * fit.scale) / 2);
    // Whatever the stage, the scaled box sits inside it on both axes.
    expect(fit.x + DESIGN_WIDTH * fit.scale).toBeLessThanOrEqual(stageWidth);
    expect(fit.y + 900 * fit.scale).toBeLessThanOrEqual(stageHeight);
  });

  it("turns a quarter turn on a handheld held upright, fitting the swapped axes", () => {
    // A phone held upright: 393x852 against a 1536x900 faceplate.
    const fit = createFaceplateFit(393, 852, 900, true);

    expect(fit.rotated).toBe(true);
    // Rotated, the faceplate's width is bounded by the stage's height and its
    // height by the stage's width.
    expect(fit.scale).toBeCloseTo(Math.min(852 / DESIGN_WIDTH, 393 / 900));
    // Rotating about the origin sweeps the box into negative x, so the
    // translate has to put it back: its right edge lands at x, its left at
    // x - contentHeight * scale.
    expect(fit.x - 900 * fit.scale).toBeGreaterThanOrEqual(0);
    expect(fit.x).toBeLessThanOrEqual(393);
    expect(fit.y).toBeGreaterThanOrEqual(0);
    expect(fit.y + DESIGN_WIDTH * fit.scale).toBeLessThanOrEqual(852);
  });

  it("leaves a landscape stage unrotated", () => {
    expect(createFaceplateFit(852, 393, 900, true).rotated).toBe(false);
    // A square stage is not portrait, so it stays put.
    expect(createFaceplateFit(600, 600, 900, true).rotated).toBe(false);
  });

  it("never rotates where there is no device to turn", () => {
    // A tall, narrow desktop window is not a phone on its side: it scales down
    // and stays the way round the display already is.
    const fit = createFaceplateFit(393, 852, 900);

    expect(fit.rotated).toBe(false);
    expect(fit.scale).toBeCloseTo(393 / DESIGN_WIDTH);
  });

  it("stays at 1 until something has been measured", () => {
    expect(createFaceplateFit(0, 0, 0).scale).toBe(1);
    expect(createFaceplateFit(1024, 768, 0).scale).toBe(1);
  });
});
