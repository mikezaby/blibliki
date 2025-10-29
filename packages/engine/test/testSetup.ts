import { Context } from "@blibliki/utils";
import { afterEach, beforeEach } from "vitest";
import { Engine } from "@/Engine";
import "@/nodePolyfill";

declare module "vitest" {
  export interface TestContext {
    context: Context;
    engine: Engine;
  }
}

beforeEach(async (ctx) => {
  ctx.context = new Context();
  ctx.engine = new Engine(ctx.context);
  await ctx.engine.initialize();
  await ctx.engine.resume();
});

afterEach(async (ctx) => {
  await ctx.context.close();
  ctx.engine.dispose();
});
