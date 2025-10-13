import { Optional, uuidv4 } from "@blibliki/utils";
import { Engine } from "@/Engine";

type IPlug = {
  moduleId: string;
  ioName: string;
};

export type IRoute = {
  id: string;
  source: IPlug;
  destination: IPlug;
};

export class Routes {
  engine: Engine;
  routes: Map<string, IRoute>;

  constructor(engine: Engine) {
    this.engine = engine;
    this.routes = new Map();
  }

  addRoute(props: Optional<IRoute, "id">): IRoute {
    const id = props.id ?? uuidv4();
    const route = { ...props, id };
    this.routes.set(id, route);

    this.plug(id);

    return route;
  }

  removeRoute(id: string) {
    this.unPlug(id);
    this.routes.delete(id);
  }

  clear() {
    for (const id in this.routes) {
      this.removeRoute(id);
    }
  }

  private plug(id: string) {
    const { sourceIO, destinationIO } = this.getIOs(id);
    sourceIO.plug(destinationIO);
  }

  private unPlug(id: string) {
    const { sourceIO, destinationIO } = this.getIOs(id);
    sourceIO.unPlug(destinationIO);
  }

  private find(id: string): IRoute {
    const route = this.routes.get(id);
    if (!route) throw Error(`Route with id ${id} not found`);

    return route;
  }

  private getIOs(id: string) {
    const route = this.find(id);
    const { source, destination } = route;

    const sourceIO = this.engine.findIO(
      source.moduleId,
      source.ioName,
      "output",
    );
    const destinationIO = this.engine.findIO(
      destination.moduleId,
      destination.ioName,
      "input",
    );

    return { sourceIO, destinationIO };
  }
}
