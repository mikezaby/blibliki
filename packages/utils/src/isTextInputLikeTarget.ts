type TargetWithElementShape = {
  tagName?: unknown;
  isContentEditable?: unknown;
  closest?: (selector: string) => Element | null;
};

export function isTextInputLikeTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;

  const element = target as TargetWithElementShape;
  const tagName =
    typeof element.tagName === "string" ? element.tagName.toLowerCase() : "";

  if (tagName === "input" || tagName === "textarea") return true;
  if (element.isContentEditable === true) return true;

  return (
    typeof element.closest === "function" &&
    Boolean(element.closest("input, textarea, [contenteditable]"))
  );
}
