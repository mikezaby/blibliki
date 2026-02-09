import { isTextInputLikeTarget } from "@blibliki/utils";

export function shouldToggleTransportOnSpace(event: KeyboardEvent): boolean {
  if (event.code !== "Space") return false;
  if (event.repeat) return false;
  if (isTextInputLikeTarget(event.target)) return false;

  return true;
}
