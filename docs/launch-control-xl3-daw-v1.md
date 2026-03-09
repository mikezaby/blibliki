# Launch Control XL 3 DAW Support (V1)

This document describes the first production-ready controller integration in Blibliki:
Novation Launch Control XL 3 in DAW mode.

## Behavior Matrix

| Control | CC | Direction | Behavior | Feedback |
| --- | ---: | --- | --- | --- |
| Play | 116 | Controller -> Engine | Starts transport (`engine.start`) | LED color updates (green when playing) |
| Record | 118 | Controller -> Engine | Stops and resets transport (`engine.stop`) | LED color updates (red when stopped) |
| Page Up | 106 | Controller -> Engine | Advances `MidiMapper.activePage` by +1 (clamped) | Mapper resync sends current page values |
| Page Down | 107 | Controller -> Engine | Moves `MidiMapper.activePage` by -1 (clamped) | Mapper resync sends current page values |
| Track Prev | 103 | Controller -> Engine | Alias for previous mapper page (-1) | Mapper resync sends current page values |
| Track Next | 102 | Controller -> Engine | Alias for next mapper page (+1) | Mapper resync sends current page values |
| Encoders/Faders | 5..36 | Both | CC mapping input and reverse sync | Sent on channel 16 (`0xBF`) |
| Shift/Brightness | 63, 112 | Engine -> Controller | Special DAW controls | Sent on channel 7 (`0xB6`) |
| Other mapped buttons | Variable | Both | CC mapping input and reverse sync | Sent on channel 1 (`0xB0`) |

## Connection and Matching

- DAW controller lifecycle is hot-plug aware: create/dispose/rebind on MIDI port state changes.
- Port matching uses fuzzy matching plus expanded candidate names for browser and Node-style names.
- Debug logs can be enabled with `globalThis.__BLIBLIKI_MIDI_DEBUG__ = true`.

## Known Limitations (V1)

- Only Launch Control XL 3 DAW mode is supported as a first-party profile.
- Navigation buttons currently target `MidiMapper` page changes only (not track selection).
- Track buttons (`Track Prev/Next`) are mapped as page navigation aliases.
- If multiple `MidiMapper` modules exist, page navigation applies to all of them.
- Generic controller profile registry/editor is not included in V1.
- Patch-load reflection behavior is implemented but still tracked as an open acceptance item in the V1 plan.
