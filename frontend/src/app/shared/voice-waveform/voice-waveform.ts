import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ZyvenAudioState } from '../../core/audio/zyven-audio-state';

@Component({
  selector: 'app-voice-waveform',
  template: '<canvas #waveform aria-hidden="true"></canvas><span aria-hidden="true"></span>',
  styleUrl: './voice-waveform.css',
})
export class VoiceWaveform implements AfterViewInit, OnDestroy {
  @ViewChild('waveform', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  private context!: CanvasRenderingContext2D;
  private animationFrame?: number;
  private frame = 0;

  private readonly resize = (): void => this.resizeCanvas();
  constructor(private readonly audioState: ZyvenAudioState) {}

  ngAfterViewInit(): void {
    const context = this.canvasRef.nativeElement.getContext('2d');
    if (!context) return;
    this.context = context;
    this.resizeCanvas();
    this.draw();
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
  }

  ngOnDestroy(): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.resize);
    window.visualViewport?.removeEventListener('resize', this.resize);
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = bounds.width * ratio;
    canvas.height = bounds.height * ratio;
    this.context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private outputLevel(index: number, count: number, spectrum?: Uint8Array<ArrayBuffer>): number {
    if (!this.audioState.speaking() || !spectrum) return 0.018;
    const center = Math.abs(index - (count - 1) / 2) / (count / 2);
    const envelope = Math.pow(1 - center, 0.75);
    const mirroredPosition = Math.abs(index - count / 2) / (count / 2);
    const bin = Math.min(spectrum.length - 1, Math.floor((1 - mirroredPosition) * spectrum.length * 0.72));
    const nearby = spectrum[Math.max(0, bin - 2)] + spectrum[bin] * 2 + spectrum[Math.min(spectrum.length - 1, bin + 2)];
    const energy = nearby / (255 * 4);
    return (0.025 + Math.pow(energy, 0.72) * 0.95) * (0.28 + envelope * 0.72);
  }

  private draw(): void {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const centerY = height / 2;
    const count = Math.max(48, Math.floor(width / 9));
    const gap = width / count;
    const spectrum = this.audioState.readOutputSpectrum();
    this.context.clearRect(0, 0, width, height);

    const gradient = this.context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(54, 129, 151, 0)');
    gradient.addColorStop(0.18, 'rgba(102, 224, 247, .6)');
    gradient.addColorStop(0.5, '#c7f8ff');
    gradient.addColorStop(0.82, 'rgba(102, 224, 247, .6)');
    gradient.addColorStop(1, 'rgba(54, 129, 151, 0)');
    this.context.strokeStyle = gradient;
    this.context.lineWidth = 1.35;
    this.context.lineCap = 'round';

    for (let index = 0; index < count; index += 1) {
      const level = this.outputLevel(index, count, spectrum);
      const barHeight = Math.max(2, Math.min(height * 0.84, level * height));
      const x = gap * index + gap / 2;
      this.context.globalAlpha = 0.48 + level * 0.7;
      this.context.beginPath();
      this.context.moveTo(x, centerY - barHeight / 2);
      this.context.lineTo(x, centerY + barHeight / 2);
      this.context.stroke();
    }

    this.context.globalAlpha = 1;
    this.frame += 1;
    this.animationFrame = requestAnimationFrame(() => this.draw());
  }
}
