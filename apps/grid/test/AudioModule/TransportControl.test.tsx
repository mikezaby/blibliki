// @vitest-environment jsdom
import { ModuleType } from "@blibliki/engine";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import AudioModule from "../../src/components/AudioModule";
import { store } from "../../src/store";

describe("TransportControl AudioModule", () => {
  it("renders transport control props in Grid without throwing", () => {
    render(
      <Provider store={store}>
        <AudioModule
          audioModule={{
            id: "transport-1",
            name: "Transport",
            moduleType: ModuleType.TransportControl,
            props: {
              bpm: 120,
              swing: 0.25,
            },
          }}
        />
      </Provider>,
    );

    expect(screen.getByText("BPM")).toBeDefined();
    expect(screen.getByText("Swing")).toBeDefined();
  });
});
