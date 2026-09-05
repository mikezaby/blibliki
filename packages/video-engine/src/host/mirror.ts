// Structural view of the audio engine, so this package does not depend on
// @blibliki/engine: any object with these two members can be mirrored.
export type PatchSource = {
  serialize(): { modules: { id: string; props: object }[] };
  onPropsUpdate(
    callback: (update: { id: string; props: object }) => void,
  ): void;
};

export function propsToControls(
  moduleId: string,
  props: object,
): Record<string, number> {
  const controls: Record<string, number> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "number") controls[`patch:${moduleId}:${key}`] = value;
  }

  return controls;
}
