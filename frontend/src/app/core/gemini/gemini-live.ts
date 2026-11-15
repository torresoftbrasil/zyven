import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { ActivityHandling, GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { ZyvenAudioState } from '../audio/zyven-audio-state';

interface SessaoLiveResponse {
  token: string;
  model: string;
  voice: string;
  systemInstruction: string;
  conversaid: string;
}

export interface AcoesFinanceirasVoz {
  prepararImportacao(): Promise<string>;
  confirmarImportacao(): string;
  abrirRevisao(): Promise<string>;
  aplicarRegra(termo: string, descricao: string, categoria: string): Promise<string>;
  cancelarImportacao(): string;
  prepararTreinos(): Promise<string>;
  confirmarTreinos(): Promise<string>;
  moverTreino(origem: string, destino: string): Promise<string>;
}

@Injectable({ providedIn: 'root' })
export class GeminiLive {
  readonly respostaTexto = signal('');
  readonly erro = signal('');
  private session?: Session;
  private inputContext?: AudioContext;
  private outputContext?: AudioContext;
  private outputAnalyser?: AnalyserNode;
  private microphone?: MediaStream;
  private processor?: ScriptProcessorNode;
  private nextPlaybackTime = 0;
  private readonly playbackSources = new Set<AudioBufferSourceNode>();
  private respostaEmAndamento = false;
  private turnoConcluido = false;
  private setupComplete = false;
  private conversaId?: string;
  private modo: 'VOZ' | 'TEXTO' = 'VOZ';
  private conectando?: Promise<void>;
  private transcricaoEntrada = '';
  private transcricaoSaida = '';
  private acoesFinanceiras?: AcoesFinanceirasVoz;
  private previaAguardandoPergunta = false;
  private confirmacaoLiberada = false;
  private revisaoAguardandoPergunta = false;
  private revisaoLiberada = false;
  private treinoAguardandoPergunta = false;
  private treinoConfirmacaoLiberada = false;
  private modulo = 'inicio';
  private conexaoGeracao = 0;

  constructor(private readonly http: HttpClient, private readonly audioState: ZyvenAudioState) {}

  definirAcoesFinanceiras(acoes: AcoesFinanceirasVoz): void { this.acoesFinanceiras = acoes; }

  async definirModulo(modulo: string): Promise<void> {
    if (this.modulo === modulo) return;
    this.modulo = modulo;
    if (!this.session) return;
    const modoAtual = this.modo;
    const conversaAtual = this.conversaId;
    await this.disconnect();
    this.conversaId = conversaAtual;
    await this.connect(modoAtual);
  }

  async connect(modo: 'VOZ' | 'TEXTO' = 'VOZ'): Promise<void> {
    this.modo = modo;
    this.erro.set('');
    if (modo === 'VOZ') this.audioState.status.set('CONECTANDO');
    if (this.session) {
      if (modo === 'VOZ') await this.startMicrophone();
      else this.stopMicrophone();
      return;
    }
    if (this.conectando) return this.conectando;
    this.conectando = this.criarConexao();
    try { await this.conectando; } finally { this.conectando = undefined; }
  }

  private async criarConexao(): Promise<void> {
    const config = await this.http.post<SessaoLiveResponse>('/api/assistente/sessao', { modulo: this.modulo, conversaid: this.conversaId }).toPromise();
    if (!config) throw new Error('Não foi possível criar a sessão do Zyven');

    this.conversaId = config.conversaid;
    const geracao = ++this.conexaoGeracao;
    const ai = new GoogleGenAI({ apiKey: config.token, httpOptions: { apiVersion: 'v1beta' } });
    this.session = await ai.live.connect({
      model: config.model,
      callbacks: {
        onopen: () => { if (this.conexaoGeracao === geracao) this.audioState.status.set('CONECTANDO'); },
        onmessage: (message) => { if (this.conexaoGeracao === geracao) this.handleMessage(message); },
        onerror: () => {
          if (this.conexaoGeracao !== geracao) return;
          this.audioState.connected.set(false);
          this.audioState.status.set('VOZ INDISPONÍVEL');
          this.erro.set('A conexão com o Gemini foi interrompida. Tente iniciar a voz novamente.');
        },
        onclose: () => { if (this.conexaoGeracao === geracao) { this.audioState.connected.set(false); this.session = undefined; } },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        thinkingConfig: { thinkingBudget: 0 },
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } } },
        systemInstruction: config.systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          activityHandling: ActivityHandling.NO_INTERRUPTION,
          automaticActivityDetection: { silenceDurationMs: 700 },
        },
        contextWindowCompression: { slidingWindow: {} },
        sessionResumption: {},
        tools: [{ functionDeclarations: [
          { name: 'solicitarImportacaoOfx', description: 'Lê a prévia do arquivo OFX preparado. Depois pergunte ao usuário se pode importar. Não confirme por conta própria.', parametersJsonSchema: { type: 'object', properties: {} } },
          { name: 'confirmarImportacaoOfx', description: 'Inicia a importação SOMENTE depois de o usuário responder afirmativamente à pergunta sobre a prévia. Não use na mesma fala em que solicitou a prévia.', parametersJsonSchema: { type: 'object', properties: {} } },
          { name: 'cancelarImportacaoOfx', description: 'Cancela a prévia quando o usuário responder negativamente. O arquivo continua preparado.', parametersJsonSchema: { type: 'object', properties: {} } },
          { name: 'abrirRevisaoOfx', description: 'Abre o popup de revisão financeira quando o usuário pedir ou aceitar revisar. A voz continua ativa.', parametersJsonSchema: { type: 'object', properties: {} } },
          { name: 'aplicarRegraFinanceira', description: 'Aplica uma regra em lote aos lançamentos cujo texto original contenha um termo, definindo descrição e categoria para agora e futuras importações. Use apenas quando o usuário especificar claramente termo, descrição e categoria.', parametersJsonSchema: { type: 'object', properties: { termo: { type: 'string' }, descricao: { type: 'string' }, categoria: { type: 'string', enum: ['ALIMENTACAO', 'MORADIA', 'TRANSPORTE', 'SAUDE', 'LAZER', 'ASSINATURAS', 'EDUCACAO', 'COMPRAS', 'TARIFAS', 'TRANSFERENCIAS', 'RECEITAS', 'OUTROS'] } }, required: ['termo', 'descricao', 'categoria'] } },
          { name: 'lerFotosTreino', description: 'Lê as fotos de treino preparadas e apresenta uma prévia. Pergunte se pode importar; aguarde resposta em nova fala.', parametersJsonSchema: { type: 'object', properties: {} } },
          { name: 'confirmarTreinos', description: 'Importa os treinos extraídos das fotos somente após a confirmação explícita do usuário.', parametersJsonSchema: { type: 'object', properties: {} } },
          { name: 'moverTreino', description: 'Move o treino de um dia da semana para hoje ou data explícita, somente quando o usuário pedir. Origem por exemplo sexta; destino hoje ou AAAA-MM-DD.', parametersJsonSchema: { type: 'object', properties: { origem: { type: 'string' }, destino: { type: 'string' } }, required: ['origem', 'destino'] } },
        ] }],
      },
    });
    if (this.setupComplete && this.modo === 'VOZ') await this.startMicrophone();
  }

  async enviarTexto(texto: string): Promise<void> {
    await this.connect('TEXTO');
    if (!this.session) throw new Error('Sessão de texto indisponível.');
    this.respostaTexto.set('Aguardando resposta…');
    this.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: texto }] }], turnComplete: true });
    if (this.conversaId) {
      void this.registrarInteracao(texto, 'USUARIO', 'TEXTO');
    }
  }

  usarTexto(): void {
    this.modo = 'TEXTO';
    this.stopMicrophone();
    this.stopPlayback();
    this.audioState.status.set('MODO TEXTO');
  }

  avisarImportacao(conteudo: string): void {
    if (this.modo === 'VOZ' && this.session) {
      this.revisaoAguardandoPergunta = true;
      this.revisaoLiberada = false;
      this.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: `Zyven, o aplicativo concluiu a operação anterior: ${conteudo} Pergunte se Tuco quer abrir a revisão. Não inicie outra importação e não abra a revisão antes da resposta dele.` }] }], turnComplete: true });
    }
  }

  async disconnect(): Promise<void> {
    this.conexaoGeracao++;
    this.stopMicrophone();
    this.stopPlayback();
    const sessaoAnterior = this.session;
    this.session = undefined;
    sessaoAnterior?.close();
    await this.inputContext?.close();
    await this.outputContext?.close();
    this.inputContext = undefined;
    this.outputContext = undefined;
    this.outputAnalyser = undefined;
    this.nextPlaybackTime = 0;
    this.audioState.detachOutputAnalyser();
    this.session = undefined;
    this.previaAguardandoPergunta = false;
    this.confirmacaoLiberada = false;
    this.revisaoAguardandoPergunta = false;
    this.revisaoLiberada = false;
    this.treinoAguardandoPergunta = false;
    this.treinoConfirmacaoLiberada = false;
    this.setupComplete = false;
    this.conversaId = undefined;
    this.audioState.connected.set(false);
    this.audioState.listening.set(false);
    this.audioState.status.set('DESCONECTADO');
    this.audioState.speaking.set(false);
    this.audioState.outputLevel.set(0);
  }

  private async startMicrophone(): Promise<void> {
    if (this.microphone || !this.session) return;
    this.microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.inputContext = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' });
    const source = this.inputContext.createMediaStreamSource(this.microphone);
    this.processor = this.inputContext.createScriptProcessor(512, 1, 1);
    this.audioState.listening.set(true);
    this.processor.onaudioprocess = (event) => {
      if (!this.session || this.respostaEmAndamento) return;
      const pcm = this.floatToPcm16(event.inputBuffer.getChannelData(0));
      this.session.sendRealtimeInput({ audio: { data: this.toBase64(pcm), mimeType: 'audio/pcm;rate=16000' } });
    };
    source.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
  }

  private stopMicrophone(): void {
    if (this.microphone && this.session) this.session.sendRealtimeInput({ audioStreamEnd: true });
    this.processor?.disconnect();
    this.processor = undefined;
    this.microphone?.getTracks().forEach((track) => track.stop());
    this.microphone = undefined;
    this.audioState.listening.set(false);
  }

  private handleMessage(message: LiveServerMessage): void {
    if (message.setupComplete && !this.setupComplete) {
      this.setupComplete = true;
      this.audioState.connected.set(true);
      this.audioState.status.set('OUVINDO');
      if (this.modo === 'VOZ') void this.startMicrophone().catch((erro: unknown) => {
        this.audioState.status.set('MICROFONE INDISPONÍVEL');
        this.erro.set(erro instanceof DOMException && erro.name === 'NotAllowedError'
          ? 'Permita o acesso ao microfone no navegador para usar a voz.'
          : 'Não foi possível acessar o microfone. Verifique o dispositivo e tente novamente.');
      });
    }
    if (message.toolCall?.functionCalls) void this.responderFerramentas(message.toolCall.functionCalls);
    if (message.serverContent?.interrupted) this.stopPlayback();
    const entrada = message.serverContent?.inputTranscription;
    if (entrada) {
      this.transcricaoEntrada += entrada.text ?? '';
      if (entrada.finished) {
        this.registrarTranscricao(this.transcricaoEntrada, true, 'USUARIO');
        this.transcricaoEntrada = '';
      }
    }
    const saida = message.serverContent?.outputTranscription;
    if (saida) {
      this.transcricaoSaida += saida.text ?? '';
      if (this.modo === 'TEXTO' && this.transcricaoSaida.trim()) this.respostaTexto.set(this.transcricaoSaida.trim());
      if (saida.finished) {
        this.registrarTranscricao(this.transcricaoSaida, true, 'ASSISTENTE');
        this.transcricaoSaida = '';
      }
    }
    if (message.data && this.modo === 'VOZ') this.playAudio(message.data);
    if (message.serverContent?.turnComplete) {
      if (!message.toolCall && this.previaAguardandoPergunta) this.confirmacaoLiberada = true;
      if (!message.toolCall && this.revisaoAguardandoPergunta) this.revisaoLiberada = true;
      if (!message.toolCall && this.treinoAguardandoPergunta) this.treinoConfirmacaoLiberada = true;
      this.turnoConcluido = true;
      this.finalizarReproducao();
    }
  }

  private async responderFerramentas(chamadas: NonNullable<NonNullable<LiveServerMessage['toolCall']>['functionCalls']>): Promise<void> {
    const respostas = [];
    for (const chamada of chamadas) {
      try {
        if (!this.acoesFinanceiras) throw new Error('Ações financeiras indisponíveis.');
        const argumentos = (chamada.args ?? {}) as Record<string, unknown>;
        let resultado: string;
        switch (chamada.name) {
          case 'solicitarImportacaoOfx':
            resultado = await this.acoesFinanceiras.prepararImportacao();
            this.previaAguardandoPergunta = true;
            this.confirmacaoLiberada = false;
            break;
          case 'confirmarImportacaoOfx':
            if (!this.confirmacaoLiberada) throw new Error('Espere a resposta do usuário à pergunta de confirmação.');
            resultado = this.acoesFinanceiras.confirmarImportacao();
            this.previaAguardandoPergunta = false;
            this.confirmacaoLiberada = false;
            break;
          case 'cancelarImportacaoOfx':
            resultado = this.acoesFinanceiras.cancelarImportacao();
            this.previaAguardandoPergunta = false;
            this.confirmacaoLiberada = false;
            break;
          case 'abrirRevisaoOfx':
            if (this.revisaoAguardandoPergunta && !this.revisaoLiberada) throw new Error('Espere a resposta do usuário antes de abrir a revisão.');
            resultado = await this.acoesFinanceiras.abrirRevisao();
            this.revisaoAguardandoPergunta = false;
            this.revisaoLiberada = false;
            break;
          case 'aplicarRegraFinanceira': resultado = await this.acoesFinanceiras.aplicarRegra(String(argumentos['termo'] ?? ''), String(argumentos['descricao'] ?? ''), String(argumentos['categoria'] ?? '')); break;
          case 'lerFotosTreino':
            resultado = await this.acoesFinanceiras.prepararTreinos();
            this.treinoAguardandoPergunta = true;
            this.treinoConfirmacaoLiberada = false;
            break;
          case 'confirmarTreinos':
            if (!this.treinoConfirmacaoLiberada) throw new Error('Espere a resposta do usuário à prévia dos treinos.');
            resultado = await this.acoesFinanceiras.confirmarTreinos();
            this.treinoAguardandoPergunta = false;
            this.treinoConfirmacaoLiberada = false;
            break;
          case 'moverTreino': resultado = await this.acoesFinanceiras.moverTreino(String(argumentos['origem'] ?? ''), String(argumentos['destino'] ?? '')); break;
          default: throw new Error('Ferramenta indisponível.');
        }
        respostas.push({ id: chamada.id, name: chamada.name, response: { output: resultado } });
      } catch (erro) {
        respostas.push({ id: chamada.id, name: chamada.name ?? 'desconhecida', response: { error: erro instanceof Error ? erro.message : 'Não foi possível concluir a ação.' } });
      }
    }
    this.session?.sendToolResponse({ functionResponses: respostas });
  }

  private registrarTranscricao(texto: string | undefined, finalizada: boolean | undefined, papel: 'USUARIO' | 'ASSISTENTE'): void {
    if (!texto?.trim() || !finalizada || !this.conversaId) return;
    void this.registrarInteracao(texto.trim(), papel, this.modo);
  }

  private async registrarInteracao(conteudo: string, papel: 'USUARIO' | 'ASSISTENTE', origem: 'VOZ' | 'TEXTO'): Promise<void> {
    if (!this.conversaId) return;
    await this.http.post(`/api/conversas/${this.conversaId}/interacoes`, {
      papel,
      origem,
      conteudo,
    }).toPromise();
  }

  private playAudio(base64: string): void {
    if (!this.respostaEmAndamento) {
      this.respostaEmAndamento = true;
      this.turnoConcluido = false;
      if (this.microphone && this.session) this.session.sendRealtimeInput({ audioStreamEnd: true });
    }
    const outputContext = this.ensureOutputAudio();
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const samples = new Int16Array(bytes.buffer);
    const buffer = outputContext.createBuffer(1, samples.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      channel[index] = samples[index] / 32768;
    }
    const source = outputContext.createBufferSource();
    this.playbackSources.add(source);
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
      this.playbackSources.delete(source);
      this.finalizarReproducao();
    };
  }

  private finalizarReproducao(): void {
    if (!this.respostaEmAndamento || !this.turnoConcluido || this.playbackSources.size > 0) return;
    this.respostaEmAndamento = false;
    this.turnoConcluido = false;
    this.audioState.speaking.set(false);
    this.audioState.listening.set(this.modo === 'VOZ' && !!this.microphone);
    this.audioState.status.set(this.modo === 'VOZ' ? 'OUVINDO' : 'MODO TEXTO');
    this.audioState.outputLevel.set(0);
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
    for (const source of this.playbackSources) source.stop();
    this.playbackSources.clear();
    this.nextPlaybackTime = 0;
    this.respostaEmAndamento = false;
    this.turnoConcluido = false;
    this.audioState.speaking.set(false);
    this.audioState.outputLevel.set(0);
    this.audioState.listening.set(this.modo === 'VOZ' && !!this.microphone);
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
