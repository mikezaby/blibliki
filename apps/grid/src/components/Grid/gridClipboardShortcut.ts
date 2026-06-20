import { isTextInputLikeTarget } from "@blibliki/utils";

export function shouldHandleGridClipboardTarget(
  target: EventTarget | null,
): boolean {
  const closest = (target as { closest?: (selector: string) => unknown } | null)
    ?.closest;
  if (
    typeof closest === "function" &&
    closest.call(target, "[data-sequencer-clipboard-scope]")
  ) {
    return false;
  }

  return !isTextInputLikeTarget(target);
}
