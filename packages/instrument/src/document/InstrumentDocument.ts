import type { InstrumentDocument } from "./types";

export class InstrumentDocumentModel {
  readonly value: InstrumentDocument;

  constructor(value: InstrumentDocument) {
    this.value = value;
  }
}

export default InstrumentDocumentModel;
