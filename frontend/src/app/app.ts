import { Component, computed, HostListener, OnDestroy, signal } from '@angular/core';
import { VoiceWaveform } from './shared/voice-waveform/voice-waveform';
import { GeminiLive } from './core/gemini/gemini-live';
import { ZyvenAudioState } from './core/audio/zyven-audio-state';

type ModuloId = 'inicio' | 'financeiro' | 'agenda' | 'tarefas' | 'integracoes';

interface Modulo { id: ModuloId; codigo: string; nome: string; }
interface Metrica { rotulo: string; valor: string; detalhe: string; }
interface Atividade { titulo: string; tipo: string; valor: string; }

@Component({
  selector: 'app-root',
  imports: [VoiceWaveform],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  readonly modulos: Modulo[] = [
    { id: 'inicio', codigo: '01', nome: 'Início' },
    { id: 'financeiro', codigo: '02', nome: 'Financeiro' },
    { id: 'agenda', codigo: '03', nome: 'Agenda' },
    { id: 'tarefas', codigo: '04', nome: 'Tarefas' },
    { id: 'integracoes', codigo: '05', nome: 'Integrações' },
  ];
  readonly abas = ['Visão geral', 'Registros', 'Análises'];
  readonly grafico = [42, 58, 49, 76, 61, 86];
  readonly moduloAtivo = signal<ModuloId>('inicio');
  readonly painelVisivel = signal(false);
  readonly painelFechando = signal(false);
  readonly abaAtiva = signal('Visão geral');
  readonly modalAberto = signal(false);
  readonly horario = signal(this.formatarHorario());
  readonly tituloModulo = computed(() => this.modulos.find((modulo) => modulo.id === this.moduloAtivo())?.nome ?? 'Início');
  readonly codigoModulo = computed(() => this.modulos.find((modulo) => modulo.id === this.moduloAtivo())?.codigo ?? '01');
  readonly metricas = computed<Metrica[]>(() => [
    { rotulo: `${this.tituloModulo()} hoje`, valor: '24', detalhe: 'Dados demonstrativos' },
    { rotulo: 'Em andamento', valor: '08', detalhe: 'Atualizado agora' },
    { rotulo: 'Concluídos', valor: '16', detalhe: '+12% no período' },
  ]);
  readonly atividades = computed<Atividade[]>(() => [
    { titulo: `${this.tituloModulo()} atualizado`, tipo: 'Sistema', valor: 'Agora' },
    { titulo: 'Novo registro', tipo: 'Entrada', valor: '10:42' },
    { titulo: 'Sincronização concluída', tipo: 'Automação', valor: '09:18' },
  ]);

  private readonly clockInterval: number;

  constructor(private readonly geminiLive: GeminiLive, readonly audioState: ZyvenAudioState) {
    this.clockInterval = window.setInterval(() => this.horario.set(this.formatarHorario()), 1000);
    document.addEventListener('pointerdown', this.connectLive, { once: true });
  }

  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
    document.removeEventListener('pointerdown', this.connectLive);
    void this.geminiLive.disconnect();
  }

  selecionarModulo(modulo: ModuloId, evento?: Event): void {
    evento?.preventDefault();
    if (modulo === 'inicio') { this.fecharPainel(); return; }
    this.moduloAtivo.set(modulo);
    this.abaAtiva.set('Visão geral');
    this.painelFechando.set(false);
    this.painelVisivel.set(true);
  }
  fecharPainel(): void {
    if (!this.painelVisivel() || this.painelFechando()) return;
    this.painelFechando.set(true);
    window.setTimeout(() => {
      this.painelVisivel.set(false);
      this.painelFechando.set(false);
      this.moduloAtivo.set('inicio');
    }, 420);
  }
  abrirModal(): void { this.modalAberto.set(true); }
  fecharModal(): void { this.modalAberto.set(false); }
  fecharModalExterno(evento: MouseEvent): void { if (evento.target === evento.currentTarget) this.fecharModal(); }
  salvar(evento: Event): void { evento.preventDefault(); this.fecharModal(); }

  @HostListener('document:keydown.escape')
  fecharComEscape(): void { this.modalAberto() ? this.fecharModal() : this.fecharPainel(); }

  private formatarHorario(): string { return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()); }
  private readonly connectLive = (): void => { void this.geminiLive.connect(); };
}
