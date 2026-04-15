import { main, setupFirebase } from "./index.js";

export type CliDependencies = {
  main: typeof main;
  setupFirebase: typeof setupFirebase;
  log: (message: string) => void;
  error: (error: unknown) => void;
  exit: (code: number) => never | void;
};

const DEFAULT_DEPENDENCIES: CliDependencies = {
  main,
  setupFirebase,
  log: console.log,
  error: console.error,
  exit: (code: number) => {
    process.exit(code);
  },
};

export function getCliHelpText() {
  return `
Blibliki Pi - Audio engine for Raspberry Pi and other devices

Usage:
  blibliki-pi                    Start from the device deployment target in Firestore
  blibliki-pi setup-firebase [url]  Setup Firebase configuration from Grid app
  blibliki-pi --help             Show this help message

Options:
  [url]  Optional Grid app URL (defaults to http://localhost:5173)

Examples:
  blibliki-pi
  blibliki-pi http://192.168.1.100:5173
  BLIBLIKI_PI_DISPLAY_MODE=osc blibliki-pi
  blibliki-pi setup-firebase
  blibliki-pi setup-firebase http://192.168.1.100:5173

Environment:
  BLIBLIKI_PI_DISPLAY_MODE   terminal (default) or osc
  BLIBLIKI_PI_DISPLAY_HOST   Display listener host (default 127.0.0.1)
  BLIBLIKI_PI_DISPLAY_PORT   Display listener UDP port (default 41234)
  BLIBLIKI_PI_CONTROL_PORT   Pi control UDP port for resync requests (default 41235)
  BLIBLIKI_PI_DISPLAY_DEBUG  Enable OSC publisher debug logs (0 or 1)
  BLIBLIKI_PI_DISPLAY_TARGET_CLASS  standard (default) or compact-standard
`;
}

export async function runCli(
  args: string[],
  dependencies: CliDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  const handleError = (error: unknown) => {
    dependencies.error(error);
    dependencies.exit(1);
  };

  if (args[0] === "setup-firebase") {
    await dependencies.setupFirebase(args[1]).catch(handleError);
    return;
  }

  if (args[0] === "--help" || args[0] === "-h") {
    dependencies.log(getCliHelpText());
    return;
  }

  if (args[0] && !args[0].startsWith("http")) {
    dependencies.error(`Unknown command: ${args[0]}`);
    dependencies.exit(1);
    return;
  }

  const gridUrl = args.find((arg) => arg.startsWith("http"));
  await dependencies.main({ gridUrl }).catch(handleError);
}
