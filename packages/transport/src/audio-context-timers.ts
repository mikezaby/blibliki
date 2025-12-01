function generateUniqueNumber(map: Map<number, () => void>): number {
  let nextId = 1;

  // Keep incrementing until we find an unused ID
  while (map.has(nextId)) {
    nextId++;
  }

  return nextId;
}

class WebAudioWrapper {
  private _audioBuffer: AudioBuffer | null = null;
  private _audioContext: AudioContext | null = null;
  private _sampleDuration: number | null = null;

  get audioContext(): AudioContext {
    this._audioContext ??= new AudioContext();
    return this._audioContext;
  }

  get audioBuffer(): AudioBuffer {
    this._audioBuffer ??= new AudioBuffer({
      length: 2,
      sampleRate: this.audioContext.sampleRate,
    });
    return this._audioBuffer;
  }

  get sampleDuration(): number {
    this._sampleDuration ??= 2 / this.audioContext.sampleRate;
    return this._sampleDuration;
  }
}

const webAudioWrapper = new WebAudioWrapper();

const SCHEDULED_TIMEOUT_FUNCTIONS = new Map<number, () => void>();
const SCHEDULED_INTERVAL_FUNCTIONS = new Map<number, () => void>();

enum TimerType {
  interval = "interval",
  timeout = "timeout",
}

const callIntervalFunction = (id: number, type: TimerType) => {
  const functions =
    type === TimerType.interval
      ? SCHEDULED_INTERVAL_FUNCTIONS
      : SCHEDULED_TIMEOUT_FUNCTIONS;

  if (functions.has(id)) {
    const func = functions.get(id);

    if (func !== undefined) {
      func();

      if (type === TimerType.timeout) {
        SCHEDULED_TIMEOUT_FUNCTIONS.delete(id);
      }
    }
  }
};

const scheduleFunction = (id: number, delay: number, type: TimerType) => {
  const now = performance.now();

  const audioBufferSourceNode = new AudioBufferSourceNode(
    webAudioWrapper.audioContext,
    { buffer: webAudioWrapper.audioBuffer },
  );

  audioBufferSourceNode.onended = () => {
    const elapsedTime = performance.now() - now;

    if (elapsedTime >= delay) {
      callIntervalFunction(id, type);
    } else {
      scheduleFunction(id, delay - elapsedTime, type);
    }

    audioBufferSourceNode.disconnect(webAudioWrapper.audioContext.destination);
  };
  audioBufferSourceNode.connect(webAudioWrapper.audioContext.destination);
  audioBufferSourceNode.start(
    Math.max(
      0,
      webAudioWrapper.audioContext.currentTime +
        delay / 1000 -
        webAudioWrapper.sampleDuration,
    ),
  );
};

const isNode = typeof window === "undefined";

// exported methods

const acClearInterval = (id: number) => {
  SCHEDULED_INTERVAL_FUNCTIONS.delete(id);
};

const acClearTimeout = (id: number) => {
  SCHEDULED_TIMEOUT_FUNCTIONS.delete(id);
};

const acSetInterval = (func: () => void, delay: number) => {
  const id = generateUniqueNumber(SCHEDULED_INTERVAL_FUNCTIONS);

  SCHEDULED_INTERVAL_FUNCTIONS.set(id, () => {
    func();

    scheduleFunction(id, delay, TimerType.interval);
  });

  scheduleFunction(id, delay, TimerType.interval);

  return id;
};

const acSetTimeout = (func: () => void, delay: number) => {
  const id = generateUniqueNumber(SCHEDULED_TIMEOUT_FUNCTIONS);

  SCHEDULED_TIMEOUT_FUNCTIONS.set(id, func);

  scheduleFunction(id, delay, TimerType.timeout);

  return id;
};

const exportedClearInterval = isNode ? clearInterval : acClearInterval;
const exportedClearTimeout = isNode ? clearTimeout : acClearTimeout;
const exportedSetInterval = isNode ? setInterval : acSetInterval;
const exportedSetTimeout = isNode ? setTimeout : acSetTimeout;

export {
  exportedClearInterval as clearInterval,
  exportedClearTimeout as clearTimeout,
  exportedSetInterval as setInterval,
  exportedSetTimeout as setTimeout,
};
