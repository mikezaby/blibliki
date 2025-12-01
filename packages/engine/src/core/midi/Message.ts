/**
 * Simple wrapper around MIDI message data (Uint8Array)
 * Replaces the webmidi Message class with native Web MIDI API data
 */
export default class Message {
  public readonly data: Uint8Array;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  /**
   * Returns the data bytes (excluding the status byte)
   */
  get dataBytes(): number[] {
    return Array.from(this.data.slice(1));
  }

  /**
   * Returns the MIDI message type based on the status byte
   */
  get type(): string {
    const statusByte = this.data[0];
    const messageType = statusByte & 0xf0;

    switch (messageType) {
      case 0x90: // Note On
        // Check if velocity is 0 (which is actually Note Off)
        return this.data[2] === 0 ? "noteoff" : "noteon";
      case 0x80: // Note Off
        return "noteoff";
      case 0xb0: // Control Change
        return "controlchange";
      case 0xe0: // Pitch Bend
        return "pitchbend";
      case 0xd0: // Channel Pressure (Aftertouch)
        return "channelaftertouch";
      case 0xa0: // Polyphonic Key Pressure
        return "keyaftertouch";
      case 0xc0: // Program Change
        return "programchange";
      default:
        return "unknown";
    }
  }
}
