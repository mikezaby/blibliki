// @vitest-environment jsdom
import { Engine, ModuleType } from "@blibliki/engine";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import AudioModule from "../../src/components/AudioModule";
import { store } from "../../src/store";

describe("Compressor AudioModule", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders every compressor control and the live reduction meter", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(Engine, "current", "get").mockReturnValue({
      findModule: () => ({
        moduleType: ModuleType.Compressor,
        getReduction: () => -12.5,
      }),
    } as unknown as Engine);

    render(
      <Provider store={store}>
        <AudioModule
          audioModule={{
            id: "compressor-1",
            name: "Compressor",
            moduleType: ModuleType.Compressor,
            props: {
              threshold: 0,
              ratio: 4,
              knee: 6,
              attack: 0.001,
              release: 0.003,
              makeup: 0,
              mix: 1,
            },
          }}
        />
      </Provider>,
    );

    for (const name of [
      "Threshold",
      "Ratio",
      "Knee",
      "Attack",
      "Release",
      "Makeup",
      "Mix",
    ]) {
      expect(screen.getByRole("slider", { name })).toBeDefined();
    }

    await waitFor(() => {
      expect(
        screen
          .getByRole("meter", { name: "Gain reduction" })
          .getAttribute("aria-valuenow"),
      ).toBe("12.5");
      expect(screen.getByText("-12.5 dB")).toBeDefined();
    });
  });
});
