// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("instrument routes", () => {
  it("renders the editor for /instruments/new instead of the collection page", async () => {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    });

    const instrumentsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/instruments",
      component: () => <Outlet />,
    });

    const instrumentsIndexRoute = createRoute({
      getParentRoute: () => instrumentsRoute,
      path: "/",
      component: () => <div>No instruments yet</div>,
    });

    const instrumentRoute = createRoute({
      getParentRoute: () => instrumentsRoute,
      path: "$instrumentId",
      component: () => <div>Track Setup</div>,
    });

    const routeTree = rootRoute.addChildren([
      instrumentsRoute.addChildren([instrumentsIndexRoute, instrumentRoute]),
    ]);

    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: ["/instruments/new"],
      }),
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByText("Track Setup")).toBeTruthy();
    expect(screen.queryByText("No instruments yet")).toBeNull();
  });
});
