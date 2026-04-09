// @vitest-environment jsdom
import { ModuleType } from "@blibliki/engine";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import AudioModule from "../../src/components/AudioModule";
import { store } from "../../src/store";

describe("Envelope AudioModule", () => {
  it("renders the retrigger toggle in Grid without throwing", () => {
    render(
      <Provider store={store}>
        <AudioModule
          audioModule={{
            id: "envelope-1",
            name: "Envelope",
            moduleType: ModuleType.Envelope,
            props: {
              attack: 0.1,
              attackCurve: 0.5,
              decay: 0.1,
              sustain: 0.8,
              release: 0.2,
              retrigger: true,
            },
          }}
        />
      </Provider>,
    );

    expect(screen.getByText("Retrigger")).toBeDefined();
  });
});
