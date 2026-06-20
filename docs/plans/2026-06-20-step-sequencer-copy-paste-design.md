# Step Sequencer Copy/Paste UX Design

## Goal

Make complex pattern authoring fast and musical by letting users reuse steps,
phrases, and pages without repeatedly rebuilding note, velocity, probability,
duration, microtime, and CC data.

## Interaction model

The sequencer has one explicit selection scope at a time:

- Clicking a step selects that step.
- Shift-clicking another step selects the contiguous range between the anchor
  step and the clicked step.
- Clicking the existing page label selects the whole current page.
- Changing page resets the selection to the first step on the destination page.

A compact toolbar displays the current scope (`Step 4`, `Steps 4–8`, or
`Page 2`) and exposes only `Copy` and `Paste`. `Cmd/Ctrl+C` and `Cmd/Ctrl+V`
perform the same actions whenever focus is inside the sequencer. The explicit
scope prevents page replacement from being inferred from navigation history.

Step and range paste replaces steps beginning at the selected destination
step. It never wraps into another page. If only part of the phrase fits, the
steps that fit are pasted and feedback reports the result, for example
`Pasted 4 of 8 steps`. Page paste replaces every destination step while
preserving the destination page name.

## Visual feedback

- A single selected step keeps the existing info-colored selection border.
- A range uses a subtle info-tinted background/border treatment across all
  selected cells.
- Page scope highlights the page label and adds a subtle info outline around
  the step grid.
- Playback remains warning-colored and visually distinct from selection.
- Copy/paste results appear as brief inline status text beside the toolbar.
- Incompatible or invalid clipboard data is not applied and produces a concise
  status message.

## Clipboard and data compatibility

Clipboard payloads use a versioned Blibliki-specific envelope with either a
`steps` payload or a `page` payload. The system clipboard receives both a
custom MIME representation and a text fallback, matching the existing grid
clipboard approach. A small in-memory fallback keeps toolbar actions useful
when browser clipboard permissions are unavailable.

Clipboard content is portable across module sequencers, instrument
sequencers, and instrument tracks. Instrument sequencer steps therefore gain
persisted CC messages. Default documents initialize them as empty, compilation
passes them to the engine unchanged, and runtime saves preserve valid CC
messages.

## Scope and safety

The first version does not introduce a general undo stack. Paste is
predictable replacement, never insertion, and page replacement requires
explicit page selection. Clipboard handlers are scoped to the sequencer so
they do not trigger the grid module clipboard. Text inputs retain normal text
copy/paste behavior.

Tests cover serialization, validation, partial paste, page-name preservation,
selection behavior, keyboard scoping, cross-sequencer CC fidelity, and
instrument document round-tripping.
