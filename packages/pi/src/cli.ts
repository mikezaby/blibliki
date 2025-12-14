#!/usr/bin/env node

import { main, setupFirebase } from "./index.js";

const args = process.argv.slice(2);

if (args[0] === "setup-firebase") {
  const gridUrl = args[1];
  setupFirebase(gridUrl).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
} else if (args[0] === "--help" || args[0] === "-h") {
  console.log(`
Blibliki Pi - Audio engine for Raspberry Pi and other devices

Usage:
  blibliki-pi                    Start the audio engine
  blibliki-pi setup-firebase [url]  Setup Firebase configuration from Grid app
  blibliki-pi --help             Show this help message

Options:
  [url]  Optional Grid app URL (defaults to http://localhost:5173)

Examples:
  blibliki-pi
  blibliki-pi setup-firebase
  blibliki-pi setup-firebase http://192.168.1.100:5173
`);
} else {
  const gridUrl = args.find((arg) => arg.startsWith("http"));
  main({ gridUrl }).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
