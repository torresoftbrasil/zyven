import { Component, computed, HostListener, OnDestroy, signal } from '@angular/core';
import { VoiceWaveform } from './shared/voice-waveform/voice-waveform';
import { GeminiLive } from './core/gemini/gemini-live';
import { ZyvenAudioState } from './core/audio/zyven-audio-state';
import { CategoriaFinanceira, FinanceiroApi, LancamentoFinanceiro } from './financeiro/financeiro-api';

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
  readonly abas = computed(() => this.moduloAtivo() === 'financeiro' ? ['Visão geral', 'Registros', 'Importar OFX'] : ['Visão geral', 'Registros', 'Análises']);
  readonly grafico = [42, 58, 49, 76, 61, 86];
  readonly moduloAtivo = signal<ModuloId>('inicio');
  readonly painelVisivel = signal(false);
  readonly painelFechando = signal(false);
  readonly abaAtiva = signal('Visão geral');
  readonly modalAberto = signal(false);
  readonly financeiroCarregando = signal(false);
  readonly financeiroImportando = signal(false);
  readonly financeiroMensagem = signal('');
  readonly financeiroErro = signal('');
  readonly lancamentosPendentes = signal<LancamentoFinanceiro[]>([]);
  readonly totalLancados = signal(0);
  readonly totalPendentes = signal(0);
  readonly categorias: { valor: CategoriaFinanceira; rotulo: string }[] = [
    { valor: 'ALIMENTACAO', rotulo: 'Alimentação' }, { valor: 'MORADIA', rotulo: 'Moradia' }, { valor: 'TRANSPORTE', rotulo: 'Transporte' }, { valor: 'SAUDE', rotulo: 'Saúde' }, { valor: 'LAZER', rotulo: 'Lazer' }, { valor: 'ASSINATURAS', rotulo: 'Assinaturas' }, { valor: 'EDUCACAO', rotulo: 'Educação' }, { valor: 'COMPRAS', rotulo: 'Compras' }, { valor: 'TARIFAS', rotulo: 'Tarifas' }, { valor: 'TRANSFERENCIAS', rotulo: 'Transferências' }, { valor: 'RECEITAS', rotulo: 'Receitas' }, { valor: 'OUTROS', rotulo: 'Outros' },
  ];
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

  constructor(private readonly geminiLive: GeminiLive, private readonly financeiroApi: FinanceiroApi, readonly audioState: ZyvenAudioState) {
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
    if (modulo === 'financeiro') void this.carregarFinanceiro();
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

  importarOfx(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const arquivo = campo.files?.[0];
    if (!arquivo || this.financeiroImportando()) return;
    if (!arquivo.name.toLowerCase().endsWith('.ofx')) { this.financeiroErro.set('Selecione um arquivo OFX válido.'); return; }
    this.financeiroImportando.set(true); this.financeiroErro.set(''); this.financeiroMensagem.set('');
    void this.financeiroApi.importar(arquivo).then((resultado) => {
      this.financeiroMensagem.set(`${resultado.importados} lançamento(s) importado(s). ${resultado.duplicados} duplicado(s) ignorado(s).`);
      campo.value = '';
      return this.carregarFinanceiro();
    }).catch((erro: unknown) => this.financeiroErro.set(erro instanceof Error ? erro.message : 'Não foi possível importar o OFX.')).finally(() => this.financeiroImportando.set(false));
  }

  confirmarLancamento(lancamento: LancamentoFinanceiro, evento: Event): void {
    const categoria = (evento.target as HTMLSelectElement).value as CategoriaFinanceira;
    if (!categoria) return;
    this.financeiroErro.set('');
    void this.financeiroApi.confirmar(lancamento.id, categoria).then(() => {
      this.financeiroMensagem.set('Categoria confirmada. A regra será usada nas próximas importações.');
      return this.carregarFinanceiro();
    }).catch((erro: unknown) => this.financeiroErro.set(erro instanceof Error ? erro.message : 'Não foi possível confirmar o lançamento.'));
  }

  rotuloCategoria(categoria: CategoriaFinanceira | null): string { return this.categorias.find((item) => item.valor === categoria)?.rotulo ?? 'Aguardando sugestão'; }
  formatarValor(valor: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor); }
  formatarConfianca(confianca: number | null): string { return confianca === null ? '' : ` · ${Math.round(confianca * 100)}%`; }
  private async carregarFinanceiro(): Promise<void> {
    this.financeiroCarregando.set(true);
    try { const resumo = await this.financeiroApi.resumo(); this.totalLancados.set(resumo.lancados); this.totalPendentes.set(resumo.pendentesrevisao); this.lancamentosPendentes.set(resumo.pendentes); }
    catch { this.financeiroErro.set('Não foi possível carregar os lançamentos financeiros.'); }
    finally { this.financeiroCarregando.set(false); }
  }

  @HostListener('document:keydown.escape')
  fecharComEscape(): void { this.modalAberto() ? this.fecharModal() : this.fecharPainel(); }

  private formatarHorario(): string { return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()); }
  private readonly connectLive = (): void => { void this.geminiLive.connect(); };
}
