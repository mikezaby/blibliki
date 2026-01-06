import MidiInputDevice from "../MidiInputDevice";
import MidiOutputDevice from "../MidiOutputDevice";

interface ControllerProps {
  input: MidiInputDevice;
  output: MidiOutputDevice;
}

export abstract class BaseController implements ControllerProps {
  input: MidiInputDevice;
  output: MidiOutputDevice;
  isInDawMode = false;

  constructor(props: ControllerProps) {
    this.input = props.input;
    this.output = props.output;

    this.initialize();
  }

  abstract initialize(): void;
  abstract enterDawMode(): void;
  abstract exitDawMode(): void;

  start() {
    // TODO: implement
  }

  stop() {
    // TODO: implement
  }
}
