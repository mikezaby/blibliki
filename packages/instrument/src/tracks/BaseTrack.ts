import BaseBlock from "@/blocks/BaseBlock";
import type { BlockPlug } from "@/blocks/types";
import type { Page } from "@/pages/Page";
import type { BlockKey, TrackPageKey } from "@/types";
import TrackMidiRuntime, {
  type TrackMidiRuntimeOptions,
} from "./TrackMidiRuntime";
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

export default abstract class BaseTrack {
  readonly key: string;
  readonly voices: number;
  readonly midiChannel: number;

  protected readonly _blocks = new Map<BlockKey, BaseBlock>();
  protected readonly _routes = new Map<string, TrackRoute>();
  protected readonly _pages = new Map<TrackPageKey, Page>();
  protected readonly _inputs = new Map<string, TrackIO>();
  protected readonly _outputs = new Map<string, TrackIO>();
  private readonly midiRuntime = new TrackMidiRuntime(this);

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

  createInternalMidiRuntime(
    source: BlockPlug,
    options: TrackMidiRuntimeOptions = {},
  ) {
    return this.midiRuntime.createInternalMidiRuntime(source, options);
  }

  createExternalMidiRuntime(
    source: BlockPlug,
    options: TrackMidiRuntimeOptions = {},
  ) {
    return this.midiRuntime.createExternalMidiRuntime(source, options);
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
