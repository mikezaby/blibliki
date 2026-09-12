import type {
  HostMessage,
  IRoute,
  IVideoModule,
  IVideoPatch,
} from "@blibliki/video-engine";

const sameProps = (a: IVideoModule, b: IVideoModule) => {
  const ap = a.props as Record<string, unknown>;
  const bp = b.props as Record<string, unknown>;
  const ak = Object.keys(ap);

  return (
    ak.length === Object.keys(bp).length &&
    ak.every((key) => Object.is(ap[key], bp[key]))
  );
};

const sameRoute = (a: IRoute, b: IRoute) =>
  a === b ||
  (a.kind === b.kind &&
    a.source.moduleId === b.source.moduleId &&
    a.source.ioName === b.source.ioName &&
    a.destination.moduleId === b.destination.moduleId &&
    a.destination.ioName === b.destination.ioName &&
    a.inMin === b.inMin &&
    a.inMax === b.inMax &&
    a.outMin === b.outMin &&
    a.outMax === b.outMax &&
    a.exp === b.exp);

// The engine commands that take the worker from `prev` to `next` without
// recreating anything else, so a knob turn keeps every LFO phase, held
// note and envelope stage. Removals first, additions before routes.
export function patchMessages(
  prev: IVideoPatch,
  next: IVideoPatch,
): HostMessage[] {
  const messages: HostMessage[] = [];
  const prevModules = new Map(prev.modules.map((m) => [m.id, m]));
  const nextModules = new Map(next.modules.map((m) => [m.id, m]));
  const prevRoutes = new Map(prev.routes.map((r) => [r.id, r]));
  const nextRoutes = new Map(next.routes.map((r) => [r.id, r]));

  for (const [id, route] of prevRoutes) {
    const after = nextRoutes.get(id);
    if (!after || !sameRoute(route, after)) {
      messages.push({ type: "removeRoute", id });
    }
  }
  for (const id of prevModules.keys()) {
    if (!nextModules.has(id)) messages.push({ type: "removeModule", id });
  }
  for (const [id, module] of nextModules) {
    const before = prevModules.get(id);
    if (!before) {
      messages.push({ type: "addModule", module });
    } else if (before !== module && !sameProps(before, module)) {
      messages.push({ type: "updateProps", id, props: module.props });
    }
  }
  for (const [id, route] of nextRoutes) {
    const before = prevRoutes.get(id);
    if (!before || !sameRoute(before, route)) {
      messages.push({ type: "addRoute", route });
    }
  }

  return messages;
}
