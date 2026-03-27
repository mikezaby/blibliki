// @vitest-environment jsdom
import { ModuleType } from "@blibliki/engine";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import AudioModule from "../../src/components/AudioModule";
import { store } from "../../src/store";

describe("MidiChannelFilter AudioModule", () => {
  it("renders midi channel filter props in Grid without throwing", () => {
    render(
      <Provider store={store}>
        <AudioModule
          audioModule={{
            id: "channel-filter-1",
            name: "Track 1 Channel",
            moduleType: ModuleType.MidiChannelFilter,
            props: {
              channel: 1,
            },
          }}
        />
      </Provider>,
    );

    expect(screen.getByText("Channel")).toBeDefined();
  });
});
