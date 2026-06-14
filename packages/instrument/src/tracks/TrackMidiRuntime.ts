import { type IRoute, ModuleType } from "@blibliki/engine";
import type BaseBlock from "@/blocks/BaseBlock";
import type { BlockModule, BlockPlug } from "@/blocks/types";
import { createTrackRuntimeModuleId } from "@/core/runtimeIds";
import { createRuntimeRouteId } from "@/core/runtimeRoutes";
import type { TrackIO } from "./types";

export type TrackMidiRuntimeOptions = {
  scopeBlockPlugs?: boolean;
  includeModules?: boolean;
};

type TrackMidiRuntimeOwner = {
  key: string;
  voices: number;
  midiChannel: number;
  findInput(ioName: string): TrackIO;
  findBlock(blockKey: string): BaseBlock;
};

function scopeBlockPlug(trackKey: string, plug: BlockPlug): BlockPlug {
  return {
    ...plug,
    moduleId: `${trackKey}.${plug.moduleId}`,
  };
}

export default class TrackMidiRuntime {
  constructor(private readonly track: TrackMidiRuntimeOwner) {}

  createInternalMidiRuntime(
    source: BlockPlug,
    options: TrackMidiRuntimeOptions = {},
  ): {
    modules: BlockModule<ModuleType.VoiceScheduler>[];
    routes: IRoute[];
  } {
    const voiceSchedulerId = this.createModuleId("voiceScheduler");
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
                voices: this.track.voices,
                props: {},
              },
            ],
      routes: [
        {
          id: createRuntimeRouteId(this.track.key, source, voiceSchedulerInput),
          source,
          destination: voiceSchedulerInput,
        },
        ...destinations.map((destination) => ({
          id: createRuntimeRouteId(
            this.track.key,
            voiceSchedulerOutput,
            destination,
          ),
          source: voiceSchedulerOutput,
          destination,
        })),
      ],
    };
  }

  createExternalMidiRuntime(
    source: BlockPlug,
    options: TrackMidiRuntimeOptions = {},
  ): {
    modules: (
      | BlockModule<ModuleType.MidiChannelFilter>
      | BlockModule<ModuleType.VoiceScheduler>
    )[];
    routes: IRoute[];
  } {
    const filterId = this.createModuleId("midiChannelFilter");
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
                  channel: this.track.midiChannel,
                },
              } satisfies BlockModule<ModuleType.MidiChannelFilter>,
            ]),
        ...internalRuntime.modules,
      ],
      routes: [
        {
          id: createRuntimeRouteId(this.track.key, source, filterInput),
          source,
          destination: filterInput,
        },
        ...internalRuntime.routes,
      ],
    };
  }

  private createModuleId(suffix: string) {
    return createTrackRuntimeModuleId(this.track.key, suffix);
  }

  private createMidiRuntimeDestinations(options: TrackMidiRuntimeOptions) {
    const midiInput = this.track.findInput("midi in");
    return midiInput.plugs.flatMap((trackPlug) => {
      const block = this.track.findBlock(trackPlug.blockKey);
      const blockInput = block.findInput(trackPlug.ioName);

      return blockInput.plugs.map((plug) =>
        options.scopeBlockPlugs
          ? scopeBlockPlug(this.track.key, plug)
          : { ...plug },
      );
    });
  }
}
