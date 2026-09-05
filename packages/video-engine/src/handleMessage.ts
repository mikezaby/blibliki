import { assertNever } from "@blibliki/utils";
import { VideoEngine } from "./VideoEngine";
import { spectrumToControls } from "./core/controls";
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
      case "spectrum":
        engine.setControls(spectrumToControls(message.bins));
        return [{ type: "spectrumBuffer", bins: message.bins }];
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
      case "setBinding":
        engine.setBinding(message.binding);
        break;
      case "removeBinding":
        engine.removeBinding(message.id);
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
