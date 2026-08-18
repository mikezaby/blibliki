// Checks MidiStreamParser without Xcode: `pnpm test` compiles this together
// with the parser (which deliberately imports nothing but Foundation).
import Foundation

func collect(_ chunks: [[UInt8]]) -> [[UInt8]] {
    let parser = MidiStreamParser()
    var messages: [[UInt8]] = []
    for chunk in chunks {
        parser.push(chunk) { messages.append($0) }
    }
    return messages
}

func expect(_ actual: [[UInt8]], _ expected: [[UInt8]], _ what: String) {
    guard actual == expected else {
        print("FAIL \(what)\n  expected \(expected)\n  got      \(actual)")
        exit(1)
    }
    print("ok   \(what)")
}

expect(
    collect([[0x90, 0x3C, 0x64, 0x80, 0x3C, 0x00]]),
    [[0x90, 0x3C, 0x64], [0x80, 0x3C, 0x00]],
    "note on then note off"
)

// A message split across CoreMIDI packets must come out whole.
expect(
    collect([[0x90, 0x3C], [0x64]]),
    [[0x90, 0x3C, 0x64]],
    "message split across packets"
)

// Running status: bare data pairs repeat the last status byte.
expect(
    collect([[0x90, 0x3C, 0x64, 0x3E, 0x64]]),
    [[0x90, 0x3C, 0x64], [0x90, 0x3E, 0x64]],
    "running status expanded"
)

expect(
    collect([[0xC0, 0x05], [0xD0, 0x40]]),
    [[0xC0, 0x05], [0xD0, 0x40]],
    "two-byte channel messages"
)

// Sysex spanning packets, which is how a LaunchControl dump arrives.
expect(
    collect([[0xF0, 0x00, 0x20], [0x29, 0x02], [0x0F, 0xF7]]),
    [[0xF0, 0x00, 0x20, 0x29, 0x02, 0x0F, 0xF7]],
    "sysex reassembled across packets"
)

// Realtime bytes may interleave anywhere, including mid-sysex, and must not
// corrupt the message in flight.
expect(
    collect([[0xF0, 0x01, 0xF8, 0x02, 0xF7]]),
    [[0xF8], [0xF0, 0x01, 0x02, 0xF7]],
    "clock inside sysex passes through"
)

expect(
    collect([[0x90, 0x3C, 0xFE, 0x64]]),
    [[0xFE], [0x90, 0x3C, 0x64]],
    "active sensing inside a note on"
)

// System common cancels running status, so trailing data alone is dropped.
expect(
    collect([[0x90, 0x3C, 0x64, 0xF3, 0x02, 0x3E, 0x64]]),
    [[0x90, 0x3C, 0x64], [0xF3, 0x02]],
    "song select cancels running status"
)

print("all midi parser checks passed")
