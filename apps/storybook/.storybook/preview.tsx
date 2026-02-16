import { UIProvider, createTheme } from "@blibliki/ui";
import type { Preview } from "@storybook/react-vite";
import "../src/stories/storybook.css";

const storybookTheme = createTheme({
  light: {
    surface0: "oklch(0.975 0.005 260)",
    surface1: "oklch(0.95 0.007 260)",
  },
  dark: {
    surface0: "oklch(0.1 0.01 260)",
    surface1: "oklch(0.14 0.01 260)",
  },
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
  },
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        dynamicTitle: true,
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const mode = context.globals.theme === "dark" ? "dark" : "light";

      return (
        <UIProvider mode={mode} theme={storybookTheme}>
          <div className="sb-root">
            <Story />
          </div>
        </UIProvider>
      );
    },
  ],
};

export default preview;
