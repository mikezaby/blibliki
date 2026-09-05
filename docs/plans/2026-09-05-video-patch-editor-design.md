# Video patch editor in the grid: design

Status: implemented. Follows
`docs/plans/2026-09-03-video-engine-design.md` (issue #62). Decision recorded
in `docs/adr/0004-video-patch-lives-in-the-audio-patch.md`.

## Goal

Edit a video patch in the grid's patchbay, on the same canvas as the audio
modules, with a Visuals node showing a live preview and a button that opens
the projector. Video props can follow audio: spectrum bands and audio module
props, through bindings.

Not in this feature: live video-param control from instrument performance
mode (a later feature), new effect modules, camera or file sources, drawing
bindings as cables.

## What you see on the canvas

The module palette gets a Video section: Source, Hue Rotate, Merge, Overlay,
Visuals. These are the five modules the video engine bootstrap ships.

Video nodes use the same node frame as audio nodes, with a third handle tone
for texture connections (beside audio and MIDI) and a colored accent in the
header. Texture handles connect only to texture handles; an audio-to-video
cable is rejected the same way an invalid audio route is today.

The Visuals node is the video Output module. Its body is a small live canvas
(about 160 by 90) showing what the projector shows, plus an Open Projector
button. One Visuals node per patch. Closing the projector popup does not stop
the preview. The Visuals button leaves instrument performance mode, and the
demo patch it loaded is removed: an instrument runs from its own document,
not from a grid patch, so there is no video patch for it to show.

Every numeric prop on a video node gets a link icon beside its control. It
opens a picker with two groups: spectrum bands (low, mid, high, level) from
each Spectrum module in the audio patch, listed by module name, and every
numeric prop of every audio module, also by module name. Choosing one and
setting an input and output range creates a binding. An audio prop with an
exponential slider is followed in slider space, so the video prop tracks the
knob's travel rather than its raw value. A bound prop shows its
control name under the slider. To make visuals react to sound: patch audio into
a Spectrum module, then link a video prop to one of its bands. This replaces the
bootstrap's "first Spectrum module in the patch" shortcut.

## Alternatives rejected

- Bindings as cables (control handles on video props, control outputs on a
  video-side "Audio In" module and on every audio module). The right
  direction later; too much for an MVP and it forces a control IO onto the
  video engine that the bootstrap deliberately left out. Bindings are data
  that can be drawn as edges later.
- Audio and video as two layers over one canvas with a toggle. You never see
  the bindings and the audio side at once, which is the point of a mixed
  patch.
- Video routing nested inside the Visuals module. A second canvas, hidden
  state, two places to look for a cable.
- Video patch as a field of the instrument document, or as its own Firestore
  collection. The user wants the patchbay; the instrument angle is future
  work.

## State and saving

The patch document's config (bpm, modules, gridNodes) gains one field,
`video`, holding the video patch as the engine serializes it: modules, routes,
bindings. Video node positions live in gridNodes beside the audio ones,
tagged with node type `videoNode`, so ReactFlow, copy and paste and viewport
handling need no new storage.

A new `videoPatchSlice` is the source of truth for video modules, routes and
bindings, mirroring `modulesSlice` for audio. The gridNodes reducers branch on
node type: connecting two texture handles adds a video route; deleting a video
node removes its module, routes and bindings. Every slice change is forwarded
as one command to the video engine host; a `load` is sent when a patch opens.
The host's echoed patch is used only to surface errors, not as state.

The host is created once per patch, where the audio engine is initialized,
and torn down with it, so the preview runs as soon as a Visuals node exists.

## Video engine changes

- Views instead of one canvas. The worker renders into an internal canvas and
  copies each frame to any number of attached views, each an OffscreenCanvas
  with a bitmap renderer context and its own frame-rate cap. The preview is a
  view at about 15 fps, the projector a view at full rate. Opening or closing
  the projector no longer recreates the WebGL context. The protocol gets
  `attachView` and `detachView` and loses `init` and `detach`.
- Spectrum per module. The spectrum message carries the audio module id and
  its controls are named `spectrum:<moduleId>:<band>`, so several Spectrum
  modules give distinct bands.

## Components

- VideoNode, registered beside AudioNode in ReactFlow's node types. Same
  frame, texture-tone handles from the module's declared inputs and one
  output, header accent, body by module type. Source, Hue Rotate, Merge and
  Overlay bodies are sliders and one select built from the prop schema, so a
  new module type with only number and enum props needs no new body.
  Visuals gets the preview canvas and the projector button.
- BindingControl, the link icon next to each numeric prop: a popover with the
  grouped control picker, input range defaulting to the control's natural
  range (0 to 1 for spectrum bands, the schema min and max for an audio
  prop), output range defaulting to the video prop's schema min and max, and
  an unlink action.
- A Video section in the module palette using the same drag and drop as
  audio modules.

## Failure handling

- A worker error becomes a grid notification through the notifications
  slice.
- A second Visuals node is refused at drop time with a notification.
- A missing or malformed `video` field loads as an empty video patch.
- Removing an audio module removes bindings that referenced it.

## Testing

Reducer tests for the video slice and the gridNodes branches; a test that a
texture-to-audio connection is rejected; a test for binding default ranges; a
rendering test for the Visuals node with a mocked host. In the engine
package, node tests for view attach and detach and per-module spectrum
naming. The preview is checked in the browser.
