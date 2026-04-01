export const DISPLAY_OSC_NAMESPACE = "/blibliki/v1";

export const DISPLAY_OSC_ADDRESSES = {
  full: `${DISPLAY_OSC_NAMESPACE}/display/full`,
  header: `${DISPLAY_OSC_NAMESPACE}/display/header`,
  band: {
    global: `${DISPLAY_OSC_NAMESPACE}/display/band/global`,
    upper: `${DISPLAY_OSC_NAMESPACE}/display/band/upper`,
    lower: `${DISPLAY_OSC_NAMESPACE}/display/band/lower`,
  },
  requestFullState: `${DISPLAY_OSC_NAMESPACE}/display/request_full_state`,
} as const;
