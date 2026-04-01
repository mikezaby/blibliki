const MACOS_GETTEXT_HINT =
  "Failed to load slint-ui. On macOS, install Homebrew gettext or otherwise provide libintl.8.dylib.";

function isMissingIntlLibraryError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("libintl.8.dylib") ||
    error.message.includes("Library not loaded")
  );
}

export async function loadSlintRuntime(
  importer: () => Promise<typeof import("slint-ui")> = () => import("slint-ui"),
) {
  try {
    return await importer();
  } catch (error) {
    if (!isMissingIntlLibraryError(error)) {
      throw error;
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${MACOS_GETTEXT_HINT} Original error: ${reason}`);
  }
}
