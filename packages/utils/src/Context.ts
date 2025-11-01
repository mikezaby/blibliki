export type AnyAudioContext = AudioContext | OfflineAudioContext;

export class Context {
  audioContext: AnyAudioContext;

  constructor(context?: AnyAudioContext) {
    this.audioContext = context ?? new AudioContext();
  }

  isOffline(): boolean {
    return this.audioContext instanceof OfflineAudioContext;
  }

  isOnline(): boolean {
    return this.audioContext instanceof AudioContext;
  }

  get destination() {
    return this.audioContext.destination;
  }

  get currentTime() {
    return this.audioContext.currentTime;
  }

  async close() {
    if (this.audioContext instanceof OfflineAudioContext) return;

    await this.audioContext.close();
  }

  async resume() {
    await this.audioContext.resume();
  }

  async addModule(url: string | URL) {
    await this.audioContext.audioWorklet.addModule(url);
  }

  newAudioWorklet(name: string) {
    return new AudioWorkletNode(this.audioContext, name);
  }

  browserToContextTime(browserTime: number): number {
    const differenceBetweenClocks = performance.now() / 1000 - this.currentTime;
    return browserTime / 1000 - differenceBetweenClocks;
  }
}
