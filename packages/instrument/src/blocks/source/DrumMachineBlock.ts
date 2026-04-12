import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";

const DEFAULT_PROPS = {
  masterLevel: 1,
  kickLevel: 1,
  kickDecay: 0.5,
  kickTone: 0.5,
  snareLevel: 1,
  snareDecay: 0.4,
  snareTone: 0.5,
  tomLevel: 1,
  tomDecay: 0.5,
  tomTone: 0.5,
  cymbalLevel: 1,
  cymbalDecay: 1.5,
  cymbalTone: 0.5,
  cowbellLevel: 1,
  cowbellDecay: 0.5,
  cowbellTone: 0.5,
  clapLevel: 1,
  clapDecay: 0.4,
  clapTone: 0.5,
  openHatLevel: 1,
  openHatDecay: 0.8,
  openHatTone: 0.5,
  closedHatLevel: 1,
  closedHatDecay: 0.2,
  closedHatTone: 0.5,
} as const;

export default class DrumMachineBlock extends BaseBlock {
  constructor() {
    super("source", "drumMachine");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Drum Machine",
      moduleType: ModuleType.DrumMachine,
      props: { ...DEFAULT_PROPS },
    });

    this.addInput({
      ioName: "midi in",
      kind: "midi",
      plugs: [{ moduleId, ioName: "midi in" }],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId, ioName: "out" }],
    });
  }
}
