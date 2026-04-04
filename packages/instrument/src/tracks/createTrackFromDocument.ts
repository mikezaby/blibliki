import type { InstrumentTrackDocument } from "@/document/types";
import type { BlockKey } from "@/types";
import Track from "./Track";

function applyControllerSlotValues(
  track: Track,
  slotValues: InstrumentTrackDocument["controllerSlotValues"],
) {
  if (!slotValues) {
    return track;
  }

  for (const [controllerSlotKey, value] of Object.entries(slotValues)) {
    const separatorIndex = controllerSlotKey.indexOf(".");
    if (
      separatorIndex <= 0 ||
      separatorIndex === controllerSlotKey.length - 1
    ) {
      continue;
    }

    const blockKey = controllerSlotKey.slice(0, separatorIndex) as BlockKey;
    const slotKey = controllerSlotKey.slice(separatorIndex + 1);
    const block = track.blocks.get(blockKey);
    if (!block) {
      continue;
    }

    const slot = block.slots.get(slotKey);
    if (!slot) {
      continue;
    }

    const module = block.modules.get(slot.binding.moduleId);
    if (!module) {
      continue;
    }

    block.updateModule(module.id, {
      props: {
        ...(module.props as Record<string, unknown>),
        [slot.binding.propKey]: value,
      },
    });
    block.updateSlot(slot.key, {
      initialValue: value,
    });
  }

  return track;
}

export function createTrackFromDocument(
  trackDocument: InstrumentTrackDocument,
  defaultVoices = 8,
) {
  return applyControllerSlotValues(
    new Track(trackDocument.key, {
      voices: trackDocument.voices ?? defaultVoices,
      midiChannel: trackDocument.midiChannel,
      sourceProfileId: trackDocument.sourceProfileId,
      fxChain: trackDocument.fxChain,
    }),
    trackDocument.controllerSlotValues,
  );
}
