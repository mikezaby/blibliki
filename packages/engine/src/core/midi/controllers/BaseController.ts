import MidiInputDevice from "../MidiInputDevice";
import MidiOutputDevice from "../MidiOutputDevice";

export interface ControllerProps {
  input: MidiInputDevice;
  output: MidiOutputDevice;
  onStart?: () => Promise<void> | void;
  onStop?: () => void;
  isPlayingState?: () => boolean;
  onPageUp?: () => Promise<void> | void;
  onPageDown?: () => Promise<void> | void;
  onTrackPrev?: () => Promise<void> | void;
  onTrackNext?: () => Promise<void> | void;
}

export abstract class BaseController implements ControllerProps {
  input: MidiInputDevice;
  output: MidiOutputDevice;
  isInDawMode = false;
  protected disposed = false;
  private startCallback?: () => Promise<void> | void;
  private stopCallback?: () => void;
  private isPlayingCallback?: () => boolean;
  private pageUpCallback?: () => Promise<void> | void;
  private pageDownCallback?: () => Promise<void> | void;
  private trackPrevCallback?: () => Promise<void> | void;
  private trackNextCallback?: () => Promise<void> | void;

  constructor(props: ControllerProps) {
    this.input = props.input;
    this.output = props.output;
    this.startCallback = props.onStart;
    this.stopCallback = props.onStop;
    this.isPlayingCallback = props.isPlayingState;
    this.pageUpCallback = props.onPageUp;
    this.pageDownCallback = props.onPageDown;
    this.trackPrevCallback = props.onTrackPrev;
    this.trackNextCallback = props.onTrackNext;
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

  protected async pageUp() {
    if (this.disposed) return;
    await this.pageUpCallback?.();
  }

  protected async pageDown() {
    if (this.disposed) return;
    await this.pageDownCallback?.();
  }

  protected async trackPrev() {
    if (this.disposed) return;
    await this.trackPrevCallback?.();
  }

  protected async trackNext() {
    if (this.disposed) return;
    await this.trackNextCallback?.();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
  }
}
