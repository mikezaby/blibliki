import { isTextInputLikeTarget } from "@blibliki/utils";

export function shouldHandleGridClipboardTarget(
  target: EventTarget | null,
): boolean {
  return !isTextInputLikeTarget(target);
}
