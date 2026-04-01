import type {
  DisplayBandKey,
  DisplayBandState,
  DisplayHeaderState,
  DisplayOscMessage,
  DisplayProtocolState,
} from "@blibliki/display-protocol";

export type DisplayStore = {
  getState: () => DisplayProtocolState | undefined;
  apply: (message: DisplayOscMessage) => DisplayProtocolState | undefined;
};

function updateBand(
  state: DisplayProtocolState,
  bandKey: DisplayBandKey,
  band: DisplayBandState,
  revision: number,
): DisplayProtocolState {
  return {
    ...state,
    revision,
    bands: state.bands.map((candidate) =>
      candidate.key === bandKey ? band : candidate,
    ),
  };
}

function updateHeader(
  state: DisplayProtocolState,
  header: DisplayHeaderState,
  revision: number,
): DisplayProtocolState {
  return {
    ...state,
    revision,
    header,
  };
}

export function createDisplayStore(): DisplayStore {
  let state: DisplayProtocolState | undefined;

  return {
    getState() {
      return state;
    },
    apply(message) {
      if (message.type === "display.request_full_state") {
        return state;
      }

      if (message.type === "display.full") {
        state = message.state;
        return state;
      }

      if (!state || message.revision <= state.revision) {
        return state;
      }

      if (message.type === "display.header") {
        state = updateHeader(state, message.header, message.revision);
        return state;
      }

      state = updateBand(
        state,
        message.bandKey,
        message.band,
        message.revision,
      );
      return state;
    },
  };
}
