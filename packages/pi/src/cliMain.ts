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
  blibliki-pi setup-firebase
  blibliki-pi setup-firebase http://192.168.1.100:5173
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

  const gridUrl = args.find((arg) => arg.startsWith("http"));
  await dependencies.main({ gridUrl }).catch(handleError);
}
