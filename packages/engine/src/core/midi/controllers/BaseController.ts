import MidiInputDevice from "../MidiInputDevice";
import MidiOutputDevice from "../MidiOutputDevice";

interface ControllerProps {
  input: MidiInputDevice;
  output: MidiOutputDevice;
  onStart?: () => Promise<void> | void;
  onStop?: () => void;
  isPlayingState?: () => boolean;
}

export abstract class BaseController implements ControllerProps {
  input: MidiInputDevice;
  output: MidiOutputDevice;
  isInDawMode = false;
  private startCallback?: () => Promise<void> | void;
  private stopCallback?: () => void;
  private isPlayingCallback?: () => boolean;

  constructor(props: ControllerProps) {
    this.input = props.input;
    this.output = props.output;
    this.startCallback = props.onStart;
    this.stopCallback = props.onStop;
    this.isPlayingCallback = props.isPlayingState;

    this.initialize();
  }

  abstract initialize(): void;
  abstract enterDawMode(): void;
  abstract exitDawMode(): void;

  async start() {
    await this.startCallback?.();
  }

  stop() {
    this.stopCallback?.();
  }

  protected isPlaying() {
    return this.isPlayingCallback?.() ?? false;
  }
}
