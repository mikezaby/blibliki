type RunnableWindow = {
  run: () => Promise<unknown>;
  show: () => void;
};

type DebugLogger = {
  debug: (message: string) => void;
};

type RunWindowOptions = {
  preferShowOnlyMode?: boolean;
  keepAlive?: () => Promise<unknown>;
};

function isMissingEventLoopProviderError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("does not provide an event loop")
  );
}

export function shouldUseShowOnlyMode(
  env: Partial<NodeJS.ProcessEnv>,
  platform: NodeJS.Platform,
) {
  if (env.SLINT_BACKEND?.startsWith("linuxkms")) {
    return true;
  }

  return (
    platform === "linux" &&
    !env.DISPLAY &&
    !env.WAYLAND_DISPLAY &&
    !env.MIR_SOCKET
  );
}

function defaultKeepAlive() {
  return new Promise<void>((resolve) => {
    void resolve;
  });
}

export async function runWindowWithFallback(
  window: RunnableWindow,
  logger: DebugLogger,
  options: RunWindowOptions = {},
) {
  const keepAlive = options.keepAlive ?? defaultKeepAlive;

  if (options.preferShowOnlyMode) {
    logger.debug("Using show-only mode for a likely direct-display backend.");
    window.show();
    await keepAlive();
    return;
  }

  try {
    await window.run();
    return;
  } catch (error) {
    if (!isMissingEventLoopProviderError(error)) {
      throw error;
    }
  }

  logger.debug(
    "Slint backend does not provide a Node event loop; falling back to show-only mode.",
  );
  window.show();
  await keepAlive();
}
