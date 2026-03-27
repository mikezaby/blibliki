// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { store } from "../../../src/store";

vi.mock("@/components/layout/Header/ThemePresetSelector", () => ({
  default: () => <button type="button">Theme preset</button>,
}));

vi.mock("@/components/layout/Header/ColorSchemeToggle", () => ({
  default: () => <button type="button">Color scheme</button>,
}));

vi.mock("@/components/layout/Header/FileMenu/LoadModal", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useUpload", () => ({
  default: () => ({
    open: vi.fn(),
  }),
}));

vi.mock("@/patchSlice", () => ({
  destroy: () => ({ type: "patch/destroy" }),
  load: () => ({ type: "patch/load" }),
  save: () => ({ type: "patch/save" }),
  setName: (value: string) => ({ type: "patch/setName", payload: value }),
}));

vi.mock("@/components/AudioModule/modulesSlice", () => ({
  modulesSelector: { selectAll: () => [] },
}));

vi.mock("@/components/AudioModule/modulePropsSlice", () => ({
  modulePropsSelector: { selectById: () => undefined },
}));

vi.mock("@/components/Modal/modalSlice", () => ({
  open: () => ({ type: "modal/open" }),
}));

vi.mock("@/globalSlice", () => ({
  start: () => ({ type: "global/start" }),
  stop: () => ({ type: "global/stop" }),
  setBpm: (value: number) => ({ type: "global/setBpm", payload: value }),
}));

vi.mock("@/store", () => ({
  store: {
    getState: () => ({
      global: { bpm: 120 },
      gridNodes: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    }),
  },
}));

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (path, [key, value]) => path.replace(`$${key}`, value),
      to,
    );

    return <a href={href}>{children}</a>;
  },
  useNavigate: () => navigateMock,
}));

vi.mock("@clerk/clerk-react", () => ({
  SignedIn: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignedOut: () => null,
  UserButton: () => <div>User</div>,
  useClerk: () => ({ openSignIn: vi.fn() }),
  useUser: () => ({ user: { id: "user-1" } }),
}));

let Header: typeof import("../../../src/components/layout/Header").default;
let FileMenu: typeof import("../../../src/components/layout/Header/FileMenu").default;

beforeAll(async () => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  ({ default: Header } = await import("../../../src/components/layout/Header"));
  ({ default: FileMenu } =
    await import("../../../src/components/layout/Header/FileMenu"));
});

describe("Header navigation", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
  });

  it("keeps instruments and devices inside the file menu instead of the header bar", () => {
    render(
      <Provider store={store}>
        <Header />
      </Provider>,
    );

    expect(screen.queryByRole("link", { name: "Instruments" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Devices" })).toBeNull();
  });

  it("groups instruments and devices together inside the file menu", () => {
    render(
      <Provider store={store}>
        <FileMenu />
      </Provider>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: /file/i }));

    const menu = screen.getByRole("menu");
    expect(within(menu).queryByText("New Instrument")).toBeNull();
    expect(
      within(menu).getByRole("link", { name: "Instruments" }),
    ).toBeDefined();
    expect(within(menu).getByRole("link", { name: "Devices" })).toBeDefined();
    expect(within(menu).getAllByRole("separator")).toHaveLength(2);
    expect(menu.className).toContain("max-h-none");
    expect(menu.className).toContain("overflow-visible");
  });
});
