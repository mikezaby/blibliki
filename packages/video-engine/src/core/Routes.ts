import { Optional, uuidv4 } from "@blibliki/utils";

export type IOKind = "texture" | "control";

export type IPlug = {
  moduleId: string;
  ioName: string;
};

export type IRoute = {
  id: string;
  kind: IOKind;
  source: IPlug;
  // For a control route the destination ioName is the prop name.
  destination: IPlug;
  // Control routes only: source range to prop range. exp is the curve of the
  // source's slider (value = min + t^exp * range), so a prop follows slider
  // position rather than the raw value.
  inMin?: number;
  inMax?: number;
  outMin?: number;
  outMax?: number;
  exp?: number;
};

export type ICreateRoute = Optional<IRoute, "id" | "kind">;

export class Routes {
  private routes = new Map<string, IRoute>();

  // One texture per input: a new texture route into an occupied input
  // replaces it. Control routes into one prop accumulate.
  addRoute(props: ICreateRoute): IRoute {
    const route: IRoute = {
      ...props,
      id: props.id ?? uuidv4(),
      kind: props.kind ?? "texture",
    };

    if (route.kind === "texture") {
      const { moduleId, ioName } = route.destination;
      for (const [id, other] of this.routes) {
        if (
          other.kind === "texture" &&
          other.destination.moduleId === moduleId &&
          other.destination.ioName === ioName
        ) {
          this.routes.delete(id);
        }
      }
    }

    this.routes.set(route.id, route);

    return route;
  }

  removeRoute(id: string) {
    this.routes.delete(id);
  }

  removeForModule(moduleId: string) {
    for (const [id, route] of this.routes) {
      if (
        route.source.moduleId === moduleId ||
        route.destination.moduleId === moduleId
      ) {
        this.routes.delete(id);
      }
    }
  }

  sourceFor(moduleId: string, ioName: string): string | null {
    for (const route of this.routes.values()) {
      if (
        route.kind === "texture" &&
        route.destination.moduleId === moduleId &&
        route.destination.ioName === ioName
      ) {
        return route.source.moduleId;
      }
    }

    return null;
  }

  controlRoutesFor(moduleId: string): IRoute[] {
    return Array.from(this.routes.values()).filter(
      (route) =>
        route.kind === "control" && route.destination.moduleId === moduleId,
    );
  }

  clear() {
    this.routes.clear();
  }

  serialize(): IRoute[] {
    return Array.from(this.routes.values());
  }
}
