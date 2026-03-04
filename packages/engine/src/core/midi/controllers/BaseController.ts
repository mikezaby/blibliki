import MidiInputDevice from "../MidiInputDevice";
import MidiOutputDevice from "../MidiOutputDevice";

export interface ControllerProps {
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
  protected disposed = false;
  private startCallback?: () => Promise<void> | void;
  private stopCallback?: () => void;
  private isPlayingCallback?: () => boolean;

  constructor(props: ControllerProps) {
    this.input = props.input;
    this.output = props.output;
    this.startCallback = props.onStart;
    this.stopCallback = props.onStop;
    this.isPlayingCallback = props.isPlayingState;
  }

  abstract initialize(): void;
  abstract enterDawMode(): void;
  abstract exitDawMode(): void;

  async start() {
    if (this.disposed) return;
    await this.startCallback?.();
  }

  stop() {
    if (this.disposed) return;
    this.stopCallback?.();
  }

  protected isPlaying() {
    return this.isPlayingCallback?.() ?? false;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
  }
}
