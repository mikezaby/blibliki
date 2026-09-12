import { assertNever } from "@blibliki/utils";
import { VideoEngine } from "./VideoEngine";
import { GraphMessage, WorkerMessage } from "./protocol";

export function handleMessage(
  engine: VideoEngine,
  message: GraphMessage,
): WorkerMessage[] {
  try {
    switch (message.type) {
      case "controls":
        engine.setControls(message.values);
        return [];
      case "midi":
        engine.midi(message.moduleId, message.ioName, message.event);
        return [];
      case "spectrum":
        engine.setSpectrum(message.moduleId, message.bins, message.sampleRate);
        return [
          {
            type: "spectrumBuffer",
            moduleId: message.moduleId,
            bins: message.bins,
          },
        ];
      case "load":
        engine.load(message.patch);
        break;
      case "addModule":
        engine.addModule(message.module);
        break;
      case "removeModule":
        engine.removeModule(message.id);
        break;
      case "updateProps":
        engine.updateProps(message.id, message.props);
        break;
      case "addRoute":
        engine.addRoute(message.route);
        break;
      case "removeRoute":
        engine.removeRoute(message.id);
        break;
      default:
        return assertNever(message);
    }

    return [{ type: "patch", patch: engine.serialize() }];
  } catch (error) {
    return [
      {
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}
