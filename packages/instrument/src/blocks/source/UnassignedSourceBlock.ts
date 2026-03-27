import BaseBlock from "@/blocks/BaseBlock";

export default class UnassignedSourceBlock extends BaseBlock {
  constructor() {
    super("source", "unassigned");

    this.addInput({
      ioName: "in",
      kind: "audio",
      plugs: [],
    });

    this.addInput({
      ioName: "midi in",
      kind: "midi",
      plugs: [],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [],
    });
  }
}
