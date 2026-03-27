import { type IRoute, ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import type { BlockModule, BlockPlug } from "@/blocks/types";
import type { Page } from "@/pages/Page";
import type { BlockKey, TrackPageKey } from "@/types";
import type {
  BaseTrackOptions,
  CreateTrackIO,
  CreateTrackRoute,
  SerializedTrack,
  TrackIO,
  TrackRoute,
} from "./types";

function createRouteId() {
  return crypto.randomUUID();
}

function createRuntimeRouteId(
  trackKey: string,
  source: BlockPlug,
  destination: BlockPlug,
) {
  return `${trackKey}:runtime:${source.moduleId}.${source.ioName}->${destination.moduleId}.${destination.ioName}`;
}

function scopeBlockPlug(trackKey: string, plug: BlockPlug): BlockPlug {
  return {
    ...plug,
    moduleId: `${trackKey}.${plug.moduleId}`,
  };
}

export default abstract class BaseTrack {
  readonly key: string;
  readonly voices: number;
  readonly midiChannel: number;

  protected readonly _blocks = new Map<BlockKey, BaseBlock>();
  protected readonly _routes = new Map<string, TrackRoute>();
  protected readonly _pages = new Map<TrackPageKey, Page>();
  protected readonly _inputs = new Map<string, TrackIO>();
  protected readonly _outputs = new Map<string, TrackIO>();

  protected constructor(key: string, options: BaseTrackOptions) {
    this.key = key;
    this.voices = options.voices;
    this.midiChannel = options.midiChannel;
  }

  get blocks(): ReadonlyMap<BlockKey, BaseBlock> {
    return this._blocks;
  }

  get routes(): ReadonlyMap<string, TrackRoute> {
    return this._routes;
  }

  get pages(): ReadonlyMap<TrackPageKey, Page> {
    return this._pages;
  }

  get inputs(): ReadonlyMap<string, TrackIO> {
    return this._inputs;
  }

  get outputs(): ReadonlyMap<string, TrackIO> {
    return this._outputs;
  }

  addBlock(block: BaseBlock) {
    this._blocks.set(block.key, block);
    return block;
  }

  removeBlock(blockKey: BlockKey) {
    this._blocks.delete(blockKey);
  }

  addRoute(props: CreateTrackRoute) {
    const id = props.id ?? createRouteId();
    const route: TrackRoute = { ...props, id };
    this._routes.set(id, route);
    return route;
  }

  removeRoute(id: string) {
    this._routes.delete(id);
  }

  addInput(input: CreateTrackIO) {
    this._inputs.set(input.ioName, input);
    return input;
  }

  addOutput(output: CreateTrackIO) {
    this._outputs.set(output.ioName, output);
    return output;
  }

  setPage(page: Page) {
    this._pages.set(page.key, page);
    return page;
  }

  findBlock(blockKey: BlockKey) {
    const block = this._blocks.get(blockKey);
    if (!block) {
      throw Error(`Block ${blockKey} not found in track ${this.key}`);
    }

    return block;
  }

  findRoute(id: string) {
    const route = this._routes.get(id);
    if (!route) {
      throw Error(`Route ${id} not found in track ${this.key}`);
    }

    return route;
  }

  findPage(pageKey: TrackPageKey) {
    const page = this._pages.get(pageKey);
    if (!page) {
      throw Error(`Page ${pageKey} not found in track ${this.key}`);
    }

    return page;
  }

  findInput(ioName: string) {
    const input = this._inputs.get(ioName);
    if (!input) {
      throw Error(`Input ${ioName} not found in track ${this.key}`);
    }

    return input;
  }

  findOutput(ioName: string) {
    const output = this._outputs.get(ioName);
    if (!output) {
      throw Error(`Output ${ioName} not found in track ${this.key}`);
    }

    return output;
  }

  private createMidiRuntimeModuleId(suffix: string) {
    return `${this.key}.runtime.${suffix}`;
  }

  private createMidiRuntimeDestinations(options: {
    scopeBlockPlugs?: boolean;
  }) {
    const midiInput = this.findInput("midi in");
    return midiInput.plugs.flatMap((trackPlug) => {
      const block = this.findBlock(trackPlug.blockKey);
      const blockInput = block.findInput(trackPlug.ioName);

      return blockInput.plugs.map((plug) =>
        options.scopeBlockPlugs ? scopeBlockPlug(this.key, plug) : { ...plug },
      );
    });
  }

  createInternalMidiRuntime(
    source: BlockPlug,
    options: { scopeBlockPlugs?: boolean; includeModules?: boolean } = {},
  ): {
    modules: BlockModule<ModuleType.VoiceScheduler>[];
    routes: IRoute[];
  } {
    const voiceSchedulerId = this.createMidiRuntimeModuleId("voiceScheduler");
    const voiceSchedulerInput: BlockPlug = {
      moduleId: voiceSchedulerId,
      ioName: "midi in",
    };
    const voiceSchedulerOutput: BlockPlug = {
      moduleId: voiceSchedulerId,
      ioName: "midi out",
    };
    const destinations = this.createMidiRuntimeDestinations(options);

    return {
      modules:
        options.includeModules === false
          ? []
          : [
              {
                id: voiceSchedulerId,
                name: "Track Voice Scheduler",
                moduleType: ModuleType.VoiceScheduler,
                voices: this.voices,
                props: {},
              },
            ],
      routes: [
        {
          id: createRuntimeRouteId(this.key, source, voiceSchedulerInput),
          source,
          destination: voiceSchedulerInput,
        },
        ...destinations.map((destination) => ({
          id: createRuntimeRouteId(this.key, voiceSchedulerOutput, destination),
          source: voiceSchedulerOutput,
          destination,
        })),
      ],
    };
  }

  createExternalMidiRuntime(
    source: BlockPlug,
    options: { scopeBlockPlugs?: boolean; includeModules?: boolean } = {},
  ): {
    modules: (
      | BlockModule<ModuleType.MidiChannelFilter>
      | BlockModule<ModuleType.VoiceScheduler>
    )[];
    routes: IRoute[];
  } {
    const filterId = this.createMidiRuntimeModuleId("midiChannelFilter");
    const filterInput: BlockPlug = { moduleId: filterId, ioName: "midi in" };
    const filterOutput: BlockPlug = { moduleId: filterId, ioName: "midi out" };
    const internalRuntime = this.createInternalMidiRuntime(
      filterOutput,
      options,
    );

    return {
      modules: [
        ...(options.includeModules === false
          ? []
          : [
              {
                id: filterId,
                name: "Track Midi Channel Filter",
                moduleType: ModuleType.MidiChannelFilter,
                props: {
                  channel: this.midiChannel,
                },
              } satisfies BlockModule<ModuleType.MidiChannelFilter>,
            ]),
        ...internalRuntime.modules,
      ],
      routes: [
        {
          id: createRuntimeRouteId(this.key, source, filterInput),
          source,
          destination: filterInput,
        },
        ...internalRuntime.routes,
      ],
    };
  }

  serialize(): SerializedTrack {
    return {
      key: this.key,
      voices: this.voices,
      midiChannel: this.midiChannel,
      blocks: Array.from(this._blocks.values()).map((block) =>
        block.serialize(),
      ),
      routes: Array.from(this._routes.values()),
      pages: Array.from(this._pages.values()),
      inputs: Array.from(this._inputs.values()),
      outputs: Array.from(this._outputs.values()),
    };
  }
}
