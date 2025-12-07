// Shared Context implementation
export abstract class ContextBase<
  T extends AudioContext | OfflineAudioContext,
> {
  audioContext: T;

  constructor(context: T) {
    this.audioContext = context;
  }

  isOffline(): boolean {
    return this.audioContext.constructor.name === "OfflineAudioContext";
  }

  isOnline(): boolean {
    return this.audioContext.constructor.name === "AudioContext";
  }

  get destination() {
    return this.audioContext.destination;
  }

  get currentTime() {
    return this.audioContext.currentTime;
  }

  async close() {
    if (this.isOffline()) return;
    await (this.audioContext as AudioContext).close();
  }

  async resume() {
    await this.audioContext.resume();
  }

  async addModule(url: string | URL) {
    await this.audioContext.audioWorklet.addModule(url);
  }

  abstract newAudioWorklet(name: string): AudioWorkletNode;

  browserToContextTime(browserTime: number): number {
    const differenceBetweenClocks = performance.now() / 1000 - this.currentTime;
    return browserTime / 1000 - differenceBetweenClocks;
  }
}
