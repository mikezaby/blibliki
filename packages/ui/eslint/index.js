import uiGovernancePlugin from "./ui-governance-plugin.js";

export function createUIGovernanceConfig(options = {}) {
  const maxClasses = options.maxClasses ?? 12;
  const severity = options.severity ?? "error";

  return {
    plugins: {
      "ui-governance": uiGovernancePlugin,
    },
    rules: {
      "ui-governance/max-tailwind-classes": [severity, { max: maxClasses }],
      "ui-governance/no-raw-color-values": severity,
    },
  };
}

export { uiGovernancePlugin };
