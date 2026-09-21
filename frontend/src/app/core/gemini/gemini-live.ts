import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { ZyvenAudioState } from '../audio/zyven-audio-state';

interface SessaoLiveResponse {
  token: string;
  model: string;
  voice: string;
  systemInstruction: string;
  conversaid: string;
}

@Injectable({ providedIn: 'root' })
export class GeminiLive {
  private session?: Session;
  private inputContext?: AudioContext;
  private outputContext?: AudioContext;
  private outputAnalyser?: AnalyserNode;
  private microphone?: MediaStream;
  private processor?: ScriptProcessorNode;
  private nextPlaybackTime = 0;
  private setupComplete = false;
  private conversaId?: string;

  constructor(private readonly http: HttpClient, private readonly audioState: ZyvenAudioState) {}

  async connect(): Promise<void> {
    if (this.session) return;
    const config = await this.http.post<SessaoLiveResponse>('/api/assistente/sessao', {}).toPromise();
    if (!config) throw new Error('Não foi possível criar a sessão do Zyven');

    this.conversaId = config.conversaid;
    const ai = new GoogleGenAI({ apiKey: config.token, httpOptions: { apiVersion: 'v1alpha' } });
    this.session = await ai.live.connect({
      model: config.model,
      callbacks: {
        onopen: () => this.audioState.status.set('CONECTANDO'),
        onmessage: (message) => this.handleMessage(message),
        onerror: () => this.audioState.connected.set(false),
        onclose: () => { this.audioState.connected.set(false); this.session = undefined; },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } } },
        systemInstruction: config.systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: { slidingWindow: {} },
        sessionResumption: {},
      },
    });
  }

  async disconnect(): Promise<void> {
    this.processor?.disconnect();
    this.microphone?.getTracks().forEach((track) => track.stop());
    this.session?.close();
    await this.inputContext?.close();
    await this.outputContext?.close();
    this.audioState.detachOutputAnalyser();
    this.session = undefined;
    this.audioState.connected.set(false);
    this.audioState.listening.set(false);
    this.audioState.status.set('DESCONECTADO');
    this.audioState.speaking.set(false);
    this.audioState.outputLevel.set(0);
  }

  private async startMicrophone(): Promise<void> {
    if (this.microphone) return;
    this.microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.inputContext = new AudioContext({ sampleRate: 16000 });
    const source = this.inputContext.createMediaStreamSource(this.microphone);
    this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);
    this.audioState.listening.set(true);
    this.processor.onaudioprocess = (event) => {
      if (!this.session) return;
      const pcm = this.floatToPcm16(event.inputBuffer.getChannelData(0));
      this.session.sendRealtimeInput({ audio: { data: this.toBase64(pcm), mimeType: 'audio/pcm;rate=16000' } });
    };
    source.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
  }

  private handleMessage(message: LiveServerMessage): void {
    if (message.setupComplete && !this.setupComplete) {
      this.setupComplete = true;
      this.audioState.connected.set(true);
      this.audioState.status.set('OUVINDO');
      void this.startMicrophone();
    }
    if (message.serverContent?.interrupted) this.stopPlayback();
    this.registrarTranscricao(message.serverContent?.inputTranscription?.text, message.serverContent?.inputTranscription?.finished, 'USUARIO');
    this.registrarTranscricao(message.serverContent?.outputTranscription?.text, message.serverContent?.outputTranscription?.finished, 'ASSISTENTE');
    if (message.data) this.playAudio(message.data);
  }

  private registrarTranscricao(texto: string | undefined, finalizada: boolean | undefined, papel: 'USUARIO' | 'ASSISTENTE'): void {
    if (!texto?.trim() || !finalizada || !this.conversaId) return;
    void this.http.post(`/api/conversas/${this.conversaId}/interacoes`, {
      papel,
      origem: 'VOZ',
      conteudo: texto.trim(),
    }).toPromise();
  }

  private playAudio(base64: string): void {
    const outputContext = this.ensureOutputAudio();
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const samples = new Int16Array(bytes.buffer);
    const buffer = outputContext.createBuffer(1, samples.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      channel[index] = samples[index] / 32768;
    }
    const source = outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAnalyser!);
    const now = outputContext.currentTime;
    const startAt = Math.max(now, this.nextPlaybackTime);
    this.nextPlaybackTime = startAt + buffer.duration;
    this.audioState.speaking.set(true);
    this.audioState.listening.set(false);
    this.audioState.status.set('FALANDO');
    this.audioState.outputLevel.set(1);
    source.start(startAt);
    source.onended = () => {
      if (!this.outputContext || this.outputContext.currentTime + 0.03 < this.nextPlaybackTime) return;
      this.audioState.speaking.set(false);
      this.audioState.listening.set(true);
      this.audioState.status.set('OUVINDO');
      this.audioState.outputLevel.set(0);
    };
  }

  private ensureOutputAudio(): AudioContext {
    if (this.outputContext && this.outputAnalyser) return this.outputContext;
    this.outputContext = new AudioContext({ sampleRate: 24000, latencyHint: 'interactive' });
    this.outputAnalyser = this.outputContext.createAnalyser();
    this.outputAnalyser.fftSize = 256;
    this.outputAnalyser.smoothingTimeConstant = 0.66;
    this.outputAnalyser.connect(this.outputContext.destination);
    this.audioState.attachOutputAnalyser(this.outputAnalyser);
    return this.outputContext;
  }

  private stopPlayback(): void {
    this.nextPlaybackTime = 0;
    this.audioState.speaking.set(false);
    this.audioState.outputLevel.set(0);
    this.audioState.listening.set(true);
    this.audioState.status.set('OUVINDO');
  }

  private floatToPcm16(samples: Float32Array): ArrayBuffer {
    const pcm = new Int16Array(samples.length);
    for (let index = 0; index < samples.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, samples[index]));
      pcm[index] = sample < 0 ? sample * 32768 : sample * 32767;
    }
    return pcm.buffer;
  }

  private toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
}
