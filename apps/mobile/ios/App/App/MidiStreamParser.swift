import Foundation

/// Turns a MIDI 1.0 byte stream into complete messages, the way Web MIDI
/// delivers them: running status expanded, sysex reassembled across packets,
/// and realtime bytes passed through without disturbing a message in flight.
final class MidiStreamParser {
    private var runningStatus: UInt8 = 0
    private var buffer: [UInt8] = []
    private var expected = 0
    private var inSysex = false

    func push(_ bytes: [UInt8], emit: ([UInt8]) -> Void) {
        for byte in bytes {
            if byte >= 0xF8 {
                emit([byte])
            } else if byte == 0xF7 {
                if inSysex {
                    buffer.append(byte)
                    emit(buffer)
                    reset()
                }
            } else if byte >= 0x80 {
                inSysex = byte == 0xF0
                runningStatus = byte < 0xF0 ? byte : 0
                buffer = [byte]
                expected = inSysex ? 0 : MidiStreamParser.length(of: byte)
                if !inSysex && expected == 1 {
                    emit(buffer)
                    buffer = []
                }
            } else if inSysex {
                buffer.append(byte)
            } else {
                if buffer.isEmpty {
                    guard runningStatus != 0 else { continue }
                    buffer = [runningStatus]
                    expected = MidiStreamParser.length(of: runningStatus)
                }
                buffer.append(byte)
                if buffer.count == expected {
                    emit(buffer)
                    buffer = []
                }
            }
        }
    }

    private func reset() {
        buffer = []
        expected = 0
        inSysex = false
    }

    private static func length(of status: UInt8) -> Int {
        switch status & 0xF0 {
        case 0x80, 0x90, 0xA0, 0xB0, 0xE0: return 3
        case 0xC0, 0xD0: return 2
        default:
            switch status {
            case 0xF2: return 3
            case 0xF1, 0xF3: return 2
            default: return 1
            }
        }
    }
}
