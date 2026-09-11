# 12. Media is decoded on the host and uploaded as frames, one player per instance

Date: 2026-09-11. Status: accepted.

## Context

The video engine renders in a worker, where there is no video element,
and file demuxing with WebCodecs is a project of its own. Artists need a
picture or a video file as a source today, and the instancing work was
done for a video shown at many positions at once, as glijs does.

## Decision

The host decodes. An Image module's file is turned into one bitmap and
uploaded once. A Video module gets one muted looping video element per
instance on the host; each element's new frames go to the worker as
transferred bitmaps, and the renderer keeps one texture per frame key.
The worker reports every Video instance's resolved seek, speed and
playing after each tick, and the host drives the elements from that: a
change of seek moves the element to that fraction of the file, at most
ten times a second so a fast control scrubs rather than stalls.

A file is chosen per session from the node and only its name is saved;
the node shows it and asks again after a reload.

## Alternatives rejected

- WebCodecs in the worker. No demuxer in the platform; a dependency and
  a format matrix for a first source.
- Drawing the video on the host and sending the composed picture. Then
  every effect would have to run on the host too, undoing the worker.
- One element per module with the instances sampling different times.
  A single decoder has one position; per-instance seek needs a player
  each, which is what glijs does as well.

## Consequences

One bitmap per player per new frame crosses to the worker; a dozen
instances of a 1080p file is real work for the decoder, and rendering
them at cell resolution is the next lever. Media files are not
persisted; storing them in IndexedDB is a later step.
