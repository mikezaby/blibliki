// @vitest-environment jsdom
import { ModuleType } from "@blibliki/engine";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import AudioModule from "../../src/components/AudioModule";
import { store } from "../../src/store";

describe("DrumMachine AudioModule", () => {
  it("renders grouped DrumMachine controls in Grid without throwing", () => {
    render(
      <Provider store={store}>
        <AudioModule
          audioModule={{
            id: "drum-machine-1",
            name: "Drum Machine",
            moduleType: ModuleType.DrumMachine,
            props: {
              masterLevel: 1,
              kickLevel: 1,
              kickDecay: 0.5,
              kickTone: 0.5,
              snareLevel: 1,
              snareDecay: 0.4,
              snareTone: 0.5,
              tomLevel: 1,
              tomDecay: 0.5,
              tomTone: 0.5,
              cymbalLevel: 1,
              cymbalDecay: 1.5,
              cymbalTone: 0.5,
              cowbellLevel: 1,
              cowbellDecay: 0.5,
              cowbellTone: 0.5,
              clapLevel: 1,
              clapDecay: 0.4,
              clapTone: 0.5,
              openHatLevel: 1,
              openHatDecay: 0.8,
              openHatTone: 0.5,
              closedHatLevel: 1,
              closedHatDecay: 0.2,
              closedHatTone: 0.5,
            },
          }}
        />
      </Provider>,
    );

    expect(screen.getByText("Master")).toBeDefined();
    expect(screen.getByText("Kick")).toBeDefined();
    expect(screen.getByText("Closed Hat")).toBeDefined();
  });
});
