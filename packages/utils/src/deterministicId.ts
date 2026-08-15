import { sha256hex } from "./sha256";

export function deterministicId(
  originalId: string,
  additionalString: string,
): string {
  const combinedString = `${originalId}:${additionalString}`;
  const hash = sha256hex(combinedString);

  const newId = `${hash.substring(0, 8)}-${hash.substring(
    8,
    12,
  )}-4${hash.substring(13, 16)}-${
    "89AB"[parseInt(hash.substring(17, 18), 16) % 4]!
  }${hash.substring(18, 21)}-${hash.substring(21, 33)}`;

  return newId;
}
