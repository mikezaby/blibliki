import { Optional, uuidv4 } from "@blibliki/utils";

export type IPlug = {
  moduleId: string;
  ioName: string;
};

export type IRoute = {
  id: string;
  source: IPlug;
  destination: IPlug;
};

export class Routes {
  private routes = new Map<string, IRoute>();

  // One texture per input: a new route into an occupied input replaces it.
  addRoute(props: Optional<IRoute, "id">): IRoute {
    const { moduleId, ioName } = props.destination;
    for (const [id, route] of this.routes) {
      if (
        route.destination.moduleId === moduleId &&
        route.destination.ioName === ioName
      ) {
        this.routes.delete(id);
      }
    }

    const route = { ...props, id: props.id ?? uuidv4() };
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
        route.destination.moduleId === moduleId &&
        route.destination.ioName === ioName
      ) {
        return route.source.moduleId;
      }
    }

    return null;
  }

  clear() {
    this.routes.clear();
  }

  serialize(): IRoute[] {
    return Array.from(this.routes.values());
  }
}
