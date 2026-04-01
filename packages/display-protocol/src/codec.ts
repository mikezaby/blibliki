import { DISPLAY_OSC_ADDRESSES } from "./addresses";
import type {
  DisplayBandKey,
  DisplayBandState,
  DisplayCellState,
  DisplayCellValue,
  DisplayHeaderState,
  DisplayProtocolState,
} from "./state";

const STRING_ENCODER = new TextEncoder();
const STRING_DECODER = new TextDecoder();
const NULL_VISUAL_NORMALIZED = -1;

type OscArg =
  | { tag: "i"; value: number }
  | { tag: "f"; value: number }
  | { tag: "s"; value: string };

export type DisplayOscMessage =
  | {
      type: "display.full";
      state: DisplayProtocolState;
    }
  | {
      type: "display.header";
      revision: number;
      header: DisplayHeaderState;
    }
  | {
      type: "display.band";
      revision: number;
      bandKey: DisplayBandKey;
      band: DisplayBandState;
    }
  | {
      type: "display.request_full_state";
    };

function paddedLength(length: number) {
  return Math.ceil((length + 1) / 4) * 4;
}

function encodeOscString(value: string) {
  const encoded = STRING_ENCODER.encode(value);
  const output = new Uint8Array(paddedLength(encoded.length));
  output.set(encoded, 0);
  return output;
}

function encodeOscArgs(args: readonly OscArg[]) {
  const typeTags = encodeOscString(`,${args.map((arg) => arg.tag).join("")}`);
  const parts = [typeTags];

  for (const arg of args) {
    if (arg.tag === "s") {
      parts.push(encodeOscString(arg.value));
      continue;
    }

    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    if (arg.tag === "i") {
      view.setInt32(0, arg.value, false);
    } else {
      view.setFloat32(0, arg.value, false);
    }
    parts.push(new Uint8Array(buffer));
  }

  return parts;
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function decodeOscString(packet: Uint8Array, offset: number) {
  let end = offset;
  while (end < packet.length && packet[end] !== 0) {
    end += 1;
  }

  const value = STRING_DECODER.decode(packet.slice(offset, end));
  return {
    value,
    nextOffset: offset + paddedLength(end - offset),
  };
}

function decodeOscArgs(
  packet: Uint8Array,
  typeTags: string,
  offset: number,
): {
  args: (number | string)[];
  nextOffset: number;
} {
  const args: (number | string)[] = [];
  let cursor = offset;

  for (const tag of typeTags) {
    if (tag === "s") {
      const decoded = decodeOscString(packet, cursor);
      args.push(decoded.value);
      cursor = decoded.nextOffset;
      continue;
    }

    const view = new DataView(
      packet.buffer,
      packet.byteOffset + cursor,
      packet.byteLength - cursor,
    );

    if (tag === "i") {
      args.push(view.getInt32(0, false));
    } else if (tag === "f") {
      args.push(view.getFloat32(0, false));
    } else {
      throw new Error(`Unsupported OSC type tag: ${tag}`);
    }

    cursor += 4;
  }

  return {
    args,
    nextOffset: cursor,
  };
}

function createCellArgs(cell: DisplayCellState): OscArg[] {
  return [
    { tag: "s", value: cell.key },
    { tag: "s", value: cell.label },
    { tag: "i", value: cell.inactive ? 1 : 0 },
    { tag: "i", value: cell.empty ? 1 : 0 },
    { tag: "s", value: cell.value.kind },
    {
      tag: "f",
      value: cell.value.kind === "number" ? cell.value.raw : 0,
    },
    {
      tag: "s",
      value:
        cell.value.kind === "enum" || cell.value.kind === "text"
          ? cell.value.raw
          : "",
    },
    {
      tag: "i",
      value: cell.value.kind === "boolean" && cell.value.raw ? 1 : 0,
    },
    { tag: "s", value: cell.value.formatted },
    {
      tag: "f",
      value: cell.value.visualNormalized ?? NULL_VISUAL_NORMALIZED,
    },
    { tag: "s", value: cell.value.visualScale },
  ];
}

function createBandArgs(band: DisplayBandState): OscArg[] {
  return [
    { tag: "s", value: band.key },
    { tag: "s", value: band.title },
    { tag: "i", value: band.cells.length },
    ...band.cells.flatMap(createCellArgs),
  ];
}

function createFullStateArgs(state: DisplayProtocolState): OscArg[] {
  return [
    { tag: "i", value: state.revision },
    { tag: "s", value: state.screen.orientation },
    { tag: "s", value: state.screen.targetClass },
    { tag: "s", value: state.header.left },
    { tag: "s", value: state.header.center },
    { tag: "s", value: state.header.right },
    { tag: "s", value: state.header.transport },
    { tag: "s", value: state.header.mode },
    { tag: "i", value: state.bands.length },
    ...state.bands.flatMap(createBandArgs),
  ];
}

function takeString(args: (number | string)[], index: number) {
  const value = args[index];
  if (typeof value !== "string") {
    throw new Error(`Expected OSC string at index ${index}`);
  }
  return value;
}

function takeNumber(args: (number | string)[], index: number) {
  const value = args[index];
  if (typeof value !== "number") {
    throw new Error(`Expected OSC number at index ${index}`);
  }
  return value;
}

function decodeCellValue(
  kind: string,
  rawNumber: number,
  rawString: string,
  rawBoolean: number,
  formatted: string,
  visualNormalized: number,
  visualScale: string,
): DisplayCellValue {
  const normalized =
    visualNormalized === NULL_VISUAL_NORMALIZED ? null : visualNormalized;
  const scale = visualScale === "log" ? "log" : "linear";

  if (kind === "number") {
    return {
      kind,
      raw: rawNumber,
      formatted,
      visualNormalized: normalized,
      visualScale: scale,
    };
  }

  if (kind === "enum") {
    return {
      kind,
      raw: rawString,
      formatted,
      visualNormalized: normalized,
      visualScale: scale,
    };
  }

  if (kind === "boolean") {
    return {
      kind,
      raw: rawBoolean === 1,
      formatted,
      visualNormalized: normalized,
      visualScale: scale,
    };
  }

  return {
    kind: "text",
    raw: rawString,
    formatted,
    visualNormalized: null,
    visualScale: scale,
  };
}

function decodeBand(
  args: (number | string)[],
  startIndex: number,
): {
  band: DisplayBandState;
  nextIndex: number;
} {
  const key = takeString(args, startIndex) as DisplayBandKey;
  const title = takeString(args, startIndex + 1);
  const cellCount = takeNumber(args, startIndex + 2);
  let cursor = startIndex + 3;
  const cells: DisplayCellState[] = [];

  for (let index = 0; index < cellCount; index += 1) {
    const keyValue = takeString(args, cursor);
    const label = takeString(args, cursor + 1);
    const inactive = takeNumber(args, cursor + 2) === 1;
    const empty = takeNumber(args, cursor + 3) === 1;
    const valueKind = takeString(args, cursor + 4);
    const rawNumber = takeNumber(args, cursor + 5);
    const rawString = takeString(args, cursor + 6);
    const rawBoolean = takeNumber(args, cursor + 7);
    const formatted = takeString(args, cursor + 8);
    const visualNormalized = takeNumber(args, cursor + 9);
    const visualScale = takeString(args, cursor + 10);

    cells.push({
      key: keyValue,
      label,
      inactive,
      empty,
      value: decodeCellValue(
        valueKind,
        rawNumber,
        rawString,
        rawBoolean,
        formatted,
        visualNormalized,
        visualScale,
      ),
    });

    cursor += 11;
  }

  return {
    band: {
      key,
      title,
      cells,
    },
    nextIndex: cursor,
  };
}

function decodeFullState(args: (number | string)[]): DisplayProtocolState {
  const revision = takeNumber(args, 0);
  const orientation = takeString(args, 1) as DisplayProtocolState["screen"]["orientation"];
  const targetClass = takeString(args, 2) as DisplayProtocolState["screen"]["targetClass"];
  const left = takeString(args, 3);
  const center = takeString(args, 4);
  const right = takeString(args, 5);
  const transport = takeString(args, 6) as DisplayHeaderState["transport"];
  const mode = takeString(args, 7) as DisplayHeaderState["mode"];
  const bandCount = takeNumber(args, 8);
  let cursor = 9;
  const bands: DisplayBandState[] = [];

  for (let index = 0; index < bandCount; index += 1) {
    const decoded = decodeBand(args, cursor);
    bands.push(decoded.band);
    cursor = decoded.nextIndex;
  }

  return {
    revision,
    screen: {
      orientation,
      targetClass,
    },
    header: {
      left,
      center,
      right,
      transport,
      mode,
    },
    bands,
  };
}

function encodeBandMessage(message: Extract<DisplayOscMessage, { type: "display.band" }>) {
  return {
    address: DISPLAY_OSC_ADDRESSES.band[message.bandKey],
    args: [{ tag: "i", value: message.revision }, ...createBandArgs(message.band)],
  } as const;
}

function encodeMessage(message: DisplayOscMessage) {
  if (message.type === "display.full") {
    return {
      address: DISPLAY_OSC_ADDRESSES.full,
      args: createFullStateArgs(message.state),
    } as const;
  }

  if (message.type === "display.header") {
    return {
      address: DISPLAY_OSC_ADDRESSES.header,
      args: [
        { tag: "i", value: message.revision },
        { tag: "s", value: message.header.left },
        { tag: "s", value: message.header.center },
        { tag: "s", value: message.header.right },
        { tag: "s", value: message.header.transport },
        { tag: "s", value: message.header.mode },
      ],
    } as const;
  }

  if (message.type === "display.band") {
    return encodeBandMessage(message);
  }

  return {
    address: DISPLAY_OSC_ADDRESSES.requestFullState,
    args: [],
  } as const;
}

function decodeBandMessage(
  bandKey: DisplayBandKey,
  args: (number | string)[],
): Extract<DisplayOscMessage, { type: "display.band" }> {
  const revision = takeNumber(args, 0);
  const decoded = decodeBand(args, 1);
  return {
    type: "display.band",
    revision,
    bandKey,
    band: decoded.band,
  };
}

export function encodeDisplayOscMessage(message: DisplayOscMessage) {
  const encoded = encodeMessage(message);
  return concatBytes([
    encodeOscString(encoded.address),
    ...encodeOscArgs(encoded.args),
  ]);
}

export function decodeDisplayOscPacket(packet: Uint8Array): DisplayOscMessage {
  const address = decodeOscString(packet, 0);
  const typeTags = decodeOscString(packet, address.nextOffset);
  const decodedArgs = decodeOscArgs(
    packet,
    typeTags.value.startsWith(",") ? typeTags.value.slice(1) : typeTags.value,
    typeTags.nextOffset,
  );

  if (address.value === DISPLAY_OSC_ADDRESSES.full) {
    return {
      type: "display.full",
      state: decodeFullState(decodedArgs.args),
    };
  }

  if (address.value === DISPLAY_OSC_ADDRESSES.header) {
    return {
      type: "display.header",
      revision: takeNumber(decodedArgs.args, 0),
      header: {
        left: takeString(decodedArgs.args, 1),
        center: takeString(decodedArgs.args, 2),
        right: takeString(decodedArgs.args, 3),
        transport: takeString(decodedArgs.args, 4) as DisplayHeaderState["transport"],
        mode: takeString(decodedArgs.args, 5) as DisplayHeaderState["mode"],
      },
    };
  }

  if (address.value === DISPLAY_OSC_ADDRESSES.band.global) {
    return decodeBandMessage("global", decodedArgs.args);
  }

  if (address.value === DISPLAY_OSC_ADDRESSES.band.upper) {
    return decodeBandMessage("upper", decodedArgs.args);
  }

  if (address.value === DISPLAY_OSC_ADDRESSES.band.lower) {
    return decodeBandMessage("lower", decodedArgs.args);
  }

  if (address.value === DISPLAY_OSC_ADDRESSES.requestFullState) {
    return {
      type: "display.request_full_state",
    };
  }

  throw new Error(`Unknown OSC address: ${address.value}`);
}
