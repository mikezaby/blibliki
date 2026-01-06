import MidiInputDevice from "../MidiInputDevice";
import MidiOutputDevice from "../MidiOutputDevice";

interface ControllerProps {
  input: MidiInputDevice;
  output: MidiOutputDevice;
}

export abstract class BaseController implements ControllerProps {
  protected input: MidiInputDevice;
  protected output: MidiOutputDevice;
  protected isInDawMode = false;

  constructor(props: ControllerProps) {
    this.input = props.input;
    this.output = props.output;

    this.initialize();
  }

  abstract initialize(): void;
  abstract enterDawMode(): void;
  abstract exitDawMode(): void;

  start() {}

  stop() {}
}
