// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Grid from "../../src/components/Grid";
import { UIProvider } from "../../src/ui-system/UIProvider";

const controlsSpy = vi.fn();

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Controls: (props: { className?: string }) => {
    controlsSpy(props);
    return <div data-testid="controls" />;
  },
  Background: () => <div data-testid="background" />,
  BackgroundVariant: { Dots: "dots" },
  useOnViewportChange: () => {},
  useReactFlow: () => ({ setViewport: vi.fn() }),
}));

vi.mock("../../src/components/Grid/useDrag", () => ({
  default: () => ({
    onDrop: vi.fn(),
    onDragOver: vi.fn(),
  }),
}));

vi.mock("../../src/components/Grid/AudioModules", () => ({
  default: () => <div data-testid="audio-modules" />,
}));

vi.mock("../../src/components/Grid/AudioNode", () => ({
  NodeTypes: {},
}));

vi.mock("../../src/components/Grid/gridNodesSlice", () => ({
  setViewport: vi.fn(() => ({ type: "gridNodes/setViewport" })),
}));

vi.mock("../../src/hooks", () => ({
  useAppDispatch: () => vi.fn(),
  useGridNodes: () => ({
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    isValidConnection: vi.fn(() => true),
  }),
  usePatch: () => ({ patch: { id: "" } }),
}));

describe("Grid layout", () => {
  it("does not use legacy tailwind utility classes on root and controls", () => {
    const { container } = render(
      <UIProvider>
        <Grid />
      </UIProvider>,
    );

    const gridRoot = container.firstElementChild as HTMLElement | null;
    expect(gridRoot).not.toBeNull();
    expect(gridRoot?.className).not.toContain("bg-slate-200");
    expect(gridRoot?.className).not.toContain("dark:");

    const controlsProps = controlsSpy.mock.calls.at(-1)?.[0] as
      | { className?: string }
      | undefined;
    expect(controlsProps).toBeDefined();
    expect(controlsProps?.className ?? "").not.toContain("bg-white");
    expect(controlsProps?.className ?? "").not.toContain("dark:");
  });
});
