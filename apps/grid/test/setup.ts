// jsdom lacks ResizeObserver, which @dnd-kit references at import time.
// ponytail: no-op stub is enough; add real sizing if a test needs it.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??=
  ResizeObserverStub as unknown as typeof ResizeObserver;
