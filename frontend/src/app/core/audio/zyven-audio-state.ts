import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ZyvenAudioState {
  readonly outputLevel = signal(0);
  readonly connected = signal(false);
  readonly listening = signal(false);
  readonly status = signal('CLIQUE PARA INICIAR');
  readonly speaking = signal(false);

  private analyser?: AnalyserNode;
  private spectrum?: Uint8Array<ArrayBuffer>;

  attachOutputAnalyser(analyser: AnalyserNode): void {
    this.analyser = analyser;
    this.spectrum = new Uint8Array(analyser.frequencyBinCount);
  }

  detachOutputAnalyser(): void {
    this.analyser = undefined;
    this.spectrum = undefined;
  }

  readOutputSpectrum(): Uint8Array<ArrayBuffer> | undefined {
    if (!this.analyser || !this.spectrum) return undefined;
    this.analyser.getByteFrequencyData(this.spectrum);
    return this.spectrum;
  }
}
