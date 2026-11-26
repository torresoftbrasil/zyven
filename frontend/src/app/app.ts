import { AfterViewInit, Component, computed, effect, HostListener, NgZone, OnDestroy, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { VoiceWaveform } from './shared/voice-waveform/voice-waveform';
import { GeminiLive } from './core/gemini/gemini-live';
import { ZyvenAudioState } from './core/audio/zyven-audio-state';
import { CategoriaFinanceira, FinanceiroApi, ImportacaoFinanceira, LancamentoFinanceiro, PreviaOfx } from './financeiro/financeiro-api';
import { AutenticacaoApi } from './core/autenticacao/autenticacao-api';
import { AcademiaApi, Treino } from './academia/academia-api';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PasskeyApi } from './core/autenticacao/passkey-api';
import { Notificacao, NotificacaoApi, PreferenciasNotificacao } from './notificacao/notificacao-api';
import { NucleoVisual } from './shared/nucleo-visual';

type ModuloId = 'inicio' | 'financeiro' | 'academia' | 'agenda' | 'tarefas' | 'integracoes';

interface Modulo { id: ModuloId; codigo: string; nome: string; }
interface Metrica { rotulo: string; valor: string; detalhe: string; }
interface Atividade { titulo: string; tipo: string; valor: string; }
interface MensagemChat { papel: 'usuario' | 'zyven'; texto: string; }

@Component({
  selector: 'app-root',
  imports: [VoiceWaveform, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css', './bento.css', './academia/academia.css'],
})
export class App implements AfterViewInit, OnDestroy {
  readonly modulos: Modulo[] = [
    { id: 'inicio', codigo: '01', nome: 'Início' },
    { id: 'financeiro', codigo: '02', nome: 'Financeiro' },
    { id: 'academia', codigo: '03', nome: 'Academia' },
    { id: 'agenda', codigo: '04', nome: 'Agenda' },
    { id: 'tarefas', codigo: '05', nome: 'Tarefas' },
    { id: 'integracoes', codigo: '06', nome: 'Integrações' },
  ];
  readonly abas = computed(() => this.moduloAtivo() === 'financeiro' ? ['Visão geral', 'Registros', 'Importar OFX'] : this.moduloAtivo() === 'academia' ? ['Treinar', 'Importar texto', 'Importar fotos'] : ['Visão geral', 'Registros', 'Análises']);
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
  readonly tempoImportacao = signal(0);
  readonly respostaComando = signal('');
  readonly modoEntrada = signal<'VOZ' | 'TEXTO'>('VOZ');
  readonly respostaTexto = computed(() => this.respostaComando() || this.geminiLive.erro() || this.geminiLive.respostaTexto());
  readonly comando = new FormControl('', { nonNullable: true });
  readonly chatAberto = signal(false);
  readonly mensagensChat = signal<MensagemChat[]>([]);
  readonly proximoTreino = computed(() => [...this.treinos()].sort((a, b) => a.data.localeCompare(b.data)).find(treino => treino.data >= new Date().toISOString().slice(0, 10)) ?? null);
  readonly agora = signal(new Date());
  readonly diaSemanaPainel = computed(() => new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(this.agora()));
  readonly diaMesPainel = computed(() => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(this.agora()));
  readonly lancamentosPendentes = signal<LancamentoFinanceiro[]>([]);
  readonly totalLancados = signal(0);
  readonly totalPendentes = signal(0);
  readonly arquivoPreparado = signal<File | null>(null);
  readonly previaOfx = signal<PreviaOfx | null>(null);
  readonly previaCarregando = signal(false);
  readonly arrastandoArquivo = signal(false);
  readonly menuAnexosAberto = signal(false);
  readonly fotosPreparadas = signal<File[]>([]);
  readonly treinos = signal<Treino[]>([]);
  readonly previaTreinos = signal<Treino[]>([]);
  readonly origemPrevia = signal<'FOTO' | 'TEXTO'>('FOTO');
  readonly textoPlano = new FormControl('', { nonNullable: true });
  readonly treinoSelecionadoId = signal<string | null>(null);
  readonly exercicioSelecionadoId = signal<string | null>(null);
  readonly treinoSelecionado = computed(() => this.treinos().find(item => item.id === this.treinoSelecionadoId()) ?? null);
  readonly exercicioSelecionado = computed(() => this.treinoSelecionado()?.exercicios.find(item => item.id === this.exercicioSelecionadoId()) ?? null);
  readonly cargaAtual = signal<number | null>(null);
  readonly faseTreino = signal<'PRONTO' | 'EXECUTANDO' | 'PAUSA'>('PRONTO');
  readonly segundosPausa = signal(0);
  readonly videoAberto = signal<string | null>(null);
  readonly videoSeguro = computed<SafeResourceUrl | null>(() => {
    const id = this.videoAberto();
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`) : null;
  });
  readonly buscandoVideo = signal(false);
  readonly videoManual = new FormControl('', { nonNullable: true });
  readonly academiaCarregando = signal(false);
  readonly academiaMensagem = signal('');
  readonly notificacoes = signal<Notificacao[]>([]);
  readonly notificacoesAbertas = signal(false);
  readonly preferenciasNotificacao = signal<PreferenciasNotificacao | null>(null);
  readonly notificacoesPendentes = computed(() => this.notificacoes().filter(item => item.estado === 'PENDENTE'));
  readonly notificacaoMensagem = signal('');
  readonly notificacoesPermitidas = signal(typeof Notification !== 'undefined' && Notification.permission === 'granted');
  readonly importacoesAbertas = signal(false);
  readonly importacoes = signal<ImportacaoFinanceira[]>([]);
  readonly termoRevisao = signal('');
  readonly revisaoSemSugestao = computed(() => this.importacoes().flatMap(importacao => importacao.lancamentos.filter(item => item.status === 'PENDENTE_REVISAO' && !item.categoria).map(item => ({ ...item, nomearquivo: importacao.nomearquivo }))));
  readonly revisaoComSugestao = computed(() => this.importacoes().flatMap(importacao => importacao.lancamentos.filter(item => item.status === 'PENDENTE_REVISAO' && !!item.categoria).map(item => ({ ...item, nomearquivo: importacao.nomearquivo }))));
  readonly revisaoConfirmados = computed(() => this.importacoes().flatMap(importacao => importacao.lancamentos.filter(item => item.status === 'LANCADO').map(item => ({ ...item, nomearquivo: importacao.nomearquivo }))));
  readonly categorias: { valor: CategoriaFinanceira; rotulo: string }[] = [
    { valor: 'ALIMENTACAO', rotulo: 'Alimentação' }, { valor: 'MORADIA', rotulo: 'Moradia' }, { valor: 'TRANSPORTE', rotulo: 'Transporte' }, { valor: 'SAUDE', rotulo: 'Saúde' }, { valor: 'LAZER', rotulo: 'Lazer' }, { valor: 'ASSINATURAS', rotulo: 'Assinaturas' }, { valor: 'EDUCACAO', rotulo: 'Educação' }, { valor: 'COMPRAS', rotulo: 'Compras' }, { valor: 'TARIFAS', rotulo: 'Tarifas' }, { valor: 'TRANSFERENCIAS', rotulo: 'Transferências' }, { valor: 'RECEITAS', rotulo: 'Receitas' }, { valor: 'OUTROS', rotulo: 'Outros' },
  ];
  readonly autenticado = signal(false);
  readonly acessoCarregando = signal(true);
  readonly autenticando = signal(false);
  readonly loginErro = signal('');
  readonly cadastroFaceId = signal(false);
  readonly cadastroFaceIdErro = signal('');
  readonly cadastrandoFaceId = signal(false);
  readonly usuario = signal('');
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
  private readonly notificacaoInterval: number;
  private importacaoInterval?: number;
  private focoFrame = 0;
  private orbitaFrame = 0;
  private nucleoVisual?: NucleoVisual;
  private inicioArrasteNucleo = 0;
  private respostaChatPendente = false;
  private pausaAte = 0;
  private readonly pausaInterval: number;

  constructor(
    private readonly geminiLive: GeminiLive,
    private readonly financeiroApi: FinanceiroApi,
    private readonly autenticacaoApi: AutenticacaoApi,
    private readonly academiaApi: AcademiaApi,
    private readonly sanitizer: DomSanitizer,
    readonly passkeyApi: PasskeyApi,
    private readonly notificacaoApi: NotificacaoApi,
    readonly audioState: ZyvenAudioState,
    private readonly zone: NgZone,
  ) {
    effect(() => {
      const resposta = this.respostaTexto();
      if (!resposta || !this.respostaChatPendente) return;
      untracked(() => this.mensagensChat.update(mensagens => {
        const ultima = mensagens.at(-1);
        if (ultima?.papel !== 'zyven') return mensagens;
        return [...mensagens.slice(0, -1), { papel: 'zyven', texto: resposta }];
      }));
      this.rolarChat();
    });
    this.clockInterval = window.setInterval(() => this.agora.set(new Date()), 60_000);
    this.notificacaoInterval = window.setInterval(() => { if (this.autenticado()) void this.avaliarNotificacoes(); }, 15 * 60 * 1000);
    this.pausaInterval = window.setInterval(() => this.atualizarPausa(), 250);
    void this.recuperarSessao();
    this.geminiLive.definirAcoesFinanceiras({
      prepararImportacao: () => this.prepararImportacao(),
      confirmarImportacao: () => this.confirmarImportacao(),
      abrirRevisao: () => this.abrirRevisaoPorVoz(),
      consultarLancamentos: (termo, pagina) => this.consultarLancamentosPorVoz(termo, pagina),
      renomearSelecionados: descricao => this.renomearSelecionadosPorVoz(descricao),
      categorizarSelecionados: categoria => this.categorizarSelecionadosPorVoz(categoria),
      confirmarSelecionados: categoria => this.confirmarSelecionadosPorVoz(categoria),
      aplicarRegra: (termo, descricao, categoria) => this.aplicarRegraPorVoz(termo, descricao, categoria),
      cancelarImportacao: () => { this.cancelarPrevia(); return 'Prévia cancelada. O arquivo continua preparado.'; },
      prepararTreinos: () => this.lerFotosTreino(),
      confirmarTreinos: () => this.confirmarFotosTreino(),
      moverTreino: (origem, destino) => this.moverTreinoPorVoz(origem, destino),
    });
  }

  ngAfterViewInit(): void {
    this.iniciarNucleoVisual();
    if (typeof window.matchMedia !== 'function' || typeof window.requestAnimationFrame !== 'function') return;
    this.zone.runOutsideAngular(() => {
      const fases: Record<string, number> = { financeiro: 198, academia: -18, agenda: 126, tarefas: 54, integracoes: -90 };
      const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
      let angulo = 0;
      let ultimoTempo = 0;
      const animar = (tempo: number): void => {
        const nav = document.querySelector<HTMLElement>('.atom-nav');
        if (nav && !movimentoReduzido.matches && !this.painelVisivel()) {
          const intervalo = ultimoTempo ? Math.min(tempo - ultimoTempo, 50) : 0;
          const sobFoco = nav.querySelector('.orbit-option:hover, .orbit-option:focus-visible') !== null;
          angulo += intervalo * (Math.PI * 2 / 180_000) * (sobFoco ? 0 : 1);
          const largura = nav.clientWidth;
          const altura = nav.clientHeight;
          const celular = largura <= 650;
          const raioX = celular ? Math.min(largura * .3, 130) : Math.min(largura * .37, 900);
          const raioY = celular ? Math.min(altura * .12, 118) : Math.min(altura * .29, 280);
          nav.style.setProperty('--orbita-diametro-x', `${raioX * 2}px`);
          nav.style.setProperty('--orbita-diametro-y', `${raioY * 2}px`);
          for (const botao of nav.querySelectorAll<HTMLElement>('.orbit-option')) {
            const fase = fases[botao.dataset['module'] ?? ''] ?? 0;
            const posicao = angulo + fase * Math.PI / 180;
            const profundidade = Math.sin(posicao);
            const x = Math.cos(posicao) * raioX;
            const y = Math.sin(posicao) * raioY;
            const z = profundidade * (celular ? 7 : 12);
            botao.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px)`;
            botao.style.zIndex = profundidade >= 0 ? '3' : '1';
          }
        }
        ultimoTempo = tempo;
        this.orbitaFrame = requestAnimationFrame(animar);
      };
      this.orbitaFrame = requestAnimationFrame(animar);
    });
  }

  private iniciarNucleoVisual(): void {
    if (this.nucleoVisual) return;
    const nav = document.querySelector<HTMLElement>('.atom-nav');
    const canvas = nav?.querySelector<HTMLCanvasElement>('.nucleus-canvas');
    if (nav && canvas) {
      try { this.nucleoVisual = new NucleoVisual(canvas); nav.classList.add('canvas-ready'); }
      catch { /* O núcleo CSS permanece como alternativa se canvas estiver indisponível. */ }
    }
  }

  ngOnDestroy(): void {
    this.nucleoVisual?.destruir();
    cancelAnimationFrame(this.focoFrame);
    cancelAnimationFrame(this.orbitaFrame);
    clearInterval(this.clockInterval);
    clearInterval(this.notificacaoInterval);
    clearInterval(this.pausaInterval);
    if (this.importacaoInterval) clearInterval(this.importacaoInterval);
    void this.geminiLive.disconnect();
  }

  selecionarModulo(modulo: ModuloId, evento?: Event, atualizarVoz = true): void {
    evento?.preventDefault();
    if (modulo === 'inicio') { this.fecharPainel(); return; }
    this.moduloAtivo.set(modulo);
    if (atualizarVoz) void this.geminiLive.definirModulo(modulo).catch(() => this.respostaComando.set('Não foi possível atualizar o contexto da voz.'));
    this.abaAtiva.set(modulo === 'academia' ? 'Treinar' : 'Visão geral');
    this.painelFechando.set(false);
    this.painelVisivel.set(true);
    if (modulo === 'financeiro') void this.carregarFinanceiro();
    if (modulo === 'academia') void this.carregarTreinos();
  }

  moverFoco(evento: PointerEvent): void {
    if (evento.pointerType === 'touch' || this.painelVisivel()) return;
    const alvo = evento.currentTarget as HTMLElement;
    const x = evento.clientX;
    const y = evento.clientY;
    cancelAnimationFrame(this.focoFrame);
    this.focoFrame = requestAnimationFrame(() => {
      const area = alvo.getBoundingClientRect();
      alvo.style.setProperty('--foco-x', `${x - area.left}px`);
      alvo.style.setProperty('--foco-y', `${y - area.top}px`);
      alvo.style.setProperty('--foco-opacidade', '1');
      for (const botao of alvo.querySelectorAll<HTMLElement>('.orbit-option')) {
        const limite = botao.getBoundingClientRect();
        const distancia = Math.hypot(x - (limite.left + limite.width / 2), y - (limite.top + limite.height / 2));
        const proximidade = Math.max(0, 1 - distancia / 260);
        botao.style.setProperty('--luz', (.55 + proximidade * .45).toFixed(3));
        botao.style.setProperty('--glint-x', `${Math.max(0, Math.min(100, (x - limite.left) / limite.width * 100)).toFixed(1)}%`);
        botao.style.setProperty('--glint-y', `${Math.max(0, Math.min(100, (y - limite.top) / limite.height * 100)).toFixed(1)}%`);
      }
    });
  }

  limparFoco(evento: PointerEvent): void {
    cancelAnimationFrame(this.focoFrame);
    const alvo = evento.currentTarget as HTMLElement;
    alvo.style.setProperty('--foco-opacidade', '0');
    for (const botao of alvo.querySelectorAll<HTMLElement>('.orbit-option')) botao.style.setProperty('--luz', '.55');
  }

  acionarNucleo(evento: MouseEvent): void {
    const botao = evento.currentTarget as HTMLButtonElement;
    const nav = botao.closest<HTMLElement>('.atom-nav');
    if (!nav) return;
    botao.classList.remove('core-active');
    void botao.offsetWidth;
    botao.classList.add('core-active');
    window.setTimeout(() => botao.classList.remove('core-active'), 500);
    const area = nav.getBoundingClientRect();
    const x = evento.detail === 0 ? area.left + area.width / 2 : evento.clientX;
    const y = evento.detail === 0 ? area.top + area.height * .47 : evento.clientY;
    this.nucleoVisual?.disparar(x, y);
  }
  fecharPainel(): void {
    if (!this.painelVisivel() || this.painelFechando()) return;
    this.painelFechando.set(true);
    window.setTimeout(() => {
      this.painelVisivel.set(false);
      this.painelFechando.set(false);
      this.moduloAtivo.set('inicio');
      void this.geminiLive.definirModulo('inicio').catch(() => undefined);
    }, 420);
  }
  abrirModal(): void { this.modalAberto.set(true); }
  fecharModal(): void { this.modalAberto.set(false); }
  fecharModalExterno(evento: MouseEvent): void { if (evento.target === evento.currentTarget) this.fecharModal(); }
  salvar(evento: Event): void { evento.preventDefault(); this.fecharModal(); }

  entrar(evento: Event): void {
    evento.preventDefault();
    if (this.autenticando()) return;
    const dados = new FormData(evento.currentTarget as HTMLFormElement);
    this.autenticando.set(true);
    this.loginErro.set('');
    void this.autenticacaoApi.entrar(String(dados.get('login') ?? '').trim(), String(dados.get('senha') ?? ''))
      .then((sessao) => {
        this.iniciarSessao(sessao.login);
        if (this.passkeyApi.instalado && this.passkeyApi.disponivel && !this.passkeyApi.temChaveNesteDispositivo()) {
          this.cadastroFaceId.set(true);
        }
      })
      .catch((erro: unknown) => {
        const status = erro instanceof HttpErrorResponse ? erro.status : -1;
        this.loginErro.set(status === 401
          ? 'Login ou senha inválidos.'
          : status === 0
            ? 'Não foi possível conectar ao servidor. Tente novamente.'
            : 'Não foi possível iniciar a sessão. Tente novamente.');
      })
      .finally(() => this.autenticando.set(false));
  }

  sair(): void {
    void this.autenticacaoApi.sair().finally(() => {
      this.nucleoVisual?.destruir();
      this.nucleoVisual = undefined;
      this.autenticado.set(false);
      this.chatAberto.set(false);
      this.mensagensChat.set([]);
      this.respostaChatPendente = false;
      this.usuario.set('');
      this.arquivoPreparado.set(null);
      this.termoRevisao.set('');
      this.previaOfx.set(null);
      this.notificacoes.set([]);
      this.cadastroFaceId.set(false);
      void this.geminiLive.disconnect();
    });
  }

  registrarFaceId(): void {
    if (this.cadastrandoFaceId()) return;
    this.cadastrandoFaceId.set(true);
    this.cadastroFaceIdErro.set('');
    void this.passkeyApi.registrar().then(() => {
      this.cadastroFaceId.set(false);
      this.respostaComando.set('Chave de acesso criada neste iPhone. O Face ID ficará disponível quando precisar entrar novamente.');
    }).catch((erro: unknown) => this.cadastroFaceIdErro.set(erro instanceof Error ? erro.message : 'Não foi possível criar a chave de acesso.'))
      .finally(() => this.cadastrandoFaceId.set(false));
  }

  async entrarComFaceId(automatico = false): Promise<void> {
    if (this.autenticando()) return;
    this.autenticando.set(true);
    this.loginErro.set('');
    try {
      await this.passkeyApi.entrar(this.passkeyApi.temChaveNesteDispositivo());
      this.iniciarSessao((await this.autenticacaoApi.sessao()).login);
    } catch (erro: unknown) {
      this.loginErro.set(automatico
        ? 'Toque em ENTRAR COM FACE ID para confirmar neste iPhone, ou use sua senha.'
        : erro instanceof Error ? erro.message : 'Não foi possível entrar com Face ID.');
    } finally {
      this.autenticando.set(false);
    }
  }

  importarOfx(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const arquivo = campo.files?.[0];
    campo.value = '';
    if (!arquivo) return;
    this.prepararArquivo(arquivo);
  }

  prepararArquivo(arquivo: File): void {
    if (!this.autenticado() || this.financeiroImportando()) return;
    if (!arquivo.name.toLowerCase().endsWith('.ofx')) { this.financeiroErro.set('Selecione um arquivo OFX válido.'); this.respostaComando.set(this.financeiroErro()); return; }
    if (arquivo.size > 5_000_000) { this.financeiroErro.set('O arquivo OFX deve ter no máximo 5 MB.'); this.respostaComando.set(this.financeiroErro()); return; }
    this.financeiroErro.set('');
    this.arquivoPreparado.set(arquivo);
    this.previaOfx.set(null);
    this.respostaComando.set(`Arquivo ${arquivo.name} preparado. Diga “Zyven, leia o OFX” ou digite o pedido.`);
  }

  escolherAnexo(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const arquivos = [...(campo.files ?? [])];
    campo.value = '';
    this.menuAnexosAberto.set(false);
    if (!arquivos.length) return;
    if (arquivos[0].name.toLowerCase().endsWith('.ofx')) this.prepararArquivo(arquivos[0]);
    else this.prepararFotos(arquivos);
  }

  private prepararFotos(arquivos: File[]): void {
    if (arquivos.some(foto => !['image/jpeg', 'image/png', 'image/webp'].includes(foto.type) || foto.size > 5_000_000) || this.fotosPreparadas().length + arquivos.length > 7) {
      this.respostaComando.set('Use até 7 fotos JPEG, PNG ou WebP, com 5 MB cada.'); return;
    }
    this.fotosPreparadas.update(atuais => [...atuais, ...arquivos]);
    this.previaTreinos.set([]);
    this.respostaComando.set(`${this.fotosPreparadas().length} foto(s) preparada(s). Diga “Zyven, leia os treinos” ou abra Academia para conferir.`);
  }

  async lerFotosTreino(): Promise<string> {
    if (!this.fotosPreparadas().length) return 'Não há fotos de treino preparadas.';
    this.academiaMensagem.set('');
    this.selecionarModulo('academia', undefined, false);
    this.abaAtiva.set('Importar fotos');
    this.academiaCarregando.set(true);
    try {
      const previa = await this.academiaApi.previa(this.fotosPreparadas());
      this.previaTreinos.set(previa);
      this.origemPrevia.set('FOTO');
      const mensagem = `Encontrei ${previa.length} treino(s) nas fotos. Confira a prévia. Posso importar?`;
      this.academiaMensagem.set(mensagem);
      return mensagem;
    } catch (erro) { const mensagem = erro instanceof Error ? erro.message : 'Não foi possível ler as fotos.'; this.academiaMensagem.set(mensagem); return mensagem; }
    finally { this.academiaCarregando.set(false); }
  }

  async confirmarFotosTreino(): Promise<string> {
    if (!this.previaTreinos().length) return 'Não há prévia de treino aguardando confirmação.';
    try {
      const salvos = await this.academiaApi.confirmar(this.previaTreinos());
      this.previaTreinos.set([]); this.fotosPreparadas.set([]);
      await this.carregarTreinos();
      this.abaAtiva.set('Treinar');
      const mensagem = `${salvos.length} treino(s) importado(s). Confira as datas e exercícios na Academia.`;
      this.academiaMensagem.set(mensagem);
      void this.avaliarNotificacoes();
      return mensagem;
    } catch (erro) { const mensagem = erro instanceof Error ? erro.message : 'Não foi possível importar os treinos.'; this.academiaMensagem.set(mensagem); return mensagem; }
  }

  private async carregarTreinos(): Promise<void> {
    try {
      const itens = await this.academiaApi.listar();
      this.treinos.set(itens);
      if (!itens.some(item => item.id === this.treinoSelecionadoId())) {
        const hoje = new Date().toLocaleDateString('sv-SE');
        this.selecionarTreino(itens.find(item => item.data >= hoje) ?? itens[0]);
      }
    }
    catch { this.academiaMensagem.set('Não foi possível carregar os treinos.'); }
  }

  async lerTextoTreino(texto = this.textoPlano.value): Promise<string> {
    this.academiaCarregando.set(true);
    this.academiaMensagem.set('Lendo o plano e organizando os próximos dias…');
    try {
      const previa = await this.academiaApi.previaTexto(texto);
      this.previaTreinos.set(previa);
      this.origemPrevia.set('TEXTO');
      this.selecionarModulo('academia', undefined, false);
      this.abaAtiva.set('Importar texto');
      const mensagem = `Organizei ${previa.length} treinos a partir do texto. Confira dias, séries e pausas na prévia; posso importar?`;
      this.academiaMensagem.set(mensagem);
      return mensagem;
    } catch (erro) {
      const mensagem = erro instanceof HttpErrorResponse ? (erro.error?.message ?? 'Não foi possível interpretar o plano.') : erro instanceof Error ? erro.message : 'Não foi possível interpretar o plano.';
      this.academiaMensagem.set(mensagem);
      return mensagem;
    } finally { this.academiaCarregando.set(false); }
  }

  async confirmarTextoTreino(): Promise<string> {
    if (!this.previaTreinos().length || this.origemPrevia() !== 'TEXTO') return 'Não há plano de texto aguardando confirmação.';
    try {
      const salvos = await this.academiaApi.confirmarTexto(this.previaTreinos());
      this.previaTreinos.set([]);
      this.textoPlano.setValue('');
      await this.carregarTreinos();
      this.abaAtiva.set('Treinar');
      const mensagem = `${salvos.length} treinos importados. Escolha o dia para começar.`;
      this.academiaMensagem.set(mensagem);
      return mensagem;
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Não foi possível salvar o plano.';
      this.academiaMensagem.set(mensagem);
      return mensagem;
    }
  }

  selecionarTreino(treino?: Treino): void {
    this.treinoSelecionadoId.set(treino?.id ?? null);
    const primeiro = treino?.exercicios.find(item => item.seriesconcluidas < this.totalSeries(item.series)) ?? treino?.exercicios[0];
    this.selecionarExercicio(primeiro?.id ?? null);
  }

  selecionarExercicio(id: string | null): void {
    this.exercicioSelecionadoId.set(id);
    this.cargaAtual.set(this.treinoSelecionado()?.exercicios.find(item => item.id === id)?.carga ?? null);
    this.faseTreino.set('PRONTO');
    this.pausaAte = 0;
    this.segundosPausa.set(0);
    this.videoManual.setValue('');
  }

  totalSeries(series: string): number { return Math.max(1, Math.min(30, Number(series.match(/^\d+/)?.[0] ?? 1))); }

  atualizarCarga(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.cargaAtual.set(valor === '' ? null : Number(valor));
  }

  async avancarSerie(): Promise<void> {
    const treino = this.treinoSelecionado();
    const exercicio = this.exercicioSelecionado();
    if (!treino?.id || !exercicio?.id || this.faseTreino() === 'PAUSA') return;
    if (this.faseTreino() === 'PRONTO') { this.faseTreino.set('EXECUTANDO'); return; }
    try {
      const atualizado = await this.academiaApi.concluirSerie(treino.id, exercicio.id, this.cargaAtual());
      this.treinos.update(itens => itens.map(item => item.id === atualizado.id ? atualizado : item));
      const atual = atualizado.exercicios.find(item => item.id === exercicio.id)!;
      if (atual.seriesconcluidas >= this.totalSeries(atual.series)) {
        const proximo = atualizado.exercicios.find(item => item.seriesconcluidas < this.totalSeries(item.series));
        if (proximo) {
          this.selecionarExercicio(proximo.id);
          this.pausaAte = Date.now() + atual.pausasegundos * 1000;
          this.segundosPausa.set(atual.pausasegundos);
          this.faseTreino.set(atual.pausasegundos ? 'PAUSA' : 'PRONTO');
          this.academiaMensagem.set(`${atual.nome} concluído. Após a pausa: ${proximo.nome}.`);
        }
        else { this.faseTreino.set('PRONTO'); this.academiaMensagem.set('Treino concluído. Bom trabalho!'); this.avisarFimPausa('Treino concluído'); }
      } else {
        this.pausaAte = Date.now() + atual.pausasegundos * 1000;
        this.segundosPausa.set(atual.pausasegundos);
        this.faseTreino.set(atual.pausasegundos ? 'PAUSA' : 'PRONTO');
      }
    } catch { this.academiaMensagem.set('Não foi possível registrar a série. Tente novamente.'); }
  }

  private atualizarPausa(): void {
    if (this.faseTreino() !== 'PAUSA') return;
    const restante = Math.max(0, Math.ceil((this.pausaAte - Date.now()) / 1000));
    this.segundosPausa.set(restante);
    if (restante === 0) { this.faseTreino.set('PRONTO'); this.avisarFimPausa('Pausa concluída. Próxima série pronta.'); }
  }

  private avisarFimPausa(mensagem: string): void {
    this.academiaMensagem.set(mensagem);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('Zyven · Academia', { body: mensagem });
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(180);
  }

  async encontrarVideo(): Promise<void> {
    const treino = this.treinoSelecionado();
    const exercicio = this.exercicioSelecionado();
    if (!treino?.id || !exercicio?.id) return;
    this.buscandoVideo.set(true);
    try {
      const url = await this.academiaApi.buscarVideo(exercicio.nome);
      const atualizado = await this.academiaApi.salvarVideo(treino.id, exercicio.id, url);
      this.treinos.update(itens => itens.map(item => item.id === atualizado.id ? atualizado : item));
      this.academiaMensagem.set('Vídeo encontrado. Confira se a execução corresponde ao seu exercício.');
    } catch (erro) { this.academiaMensagem.set(erro instanceof HttpErrorResponse ? (erro.error?.message ?? 'Não foi possível buscar o vídeo.') : 'Não foi possível buscar o vídeo.'); }
    finally { this.buscandoVideo.set(false); }
  }

  async adicionarVideoManual(): Promise<void> {
    const treino = this.treinoSelecionado();
    const exercicio = this.exercicioSelecionado();
    const id = this.videoManual.value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
    if (!treino?.id || !exercicio?.id || !id) { this.academiaMensagem.set('Cole um link válido de vídeo do YouTube.'); return; }
    try {
      const atualizado = await this.academiaApi.salvarVideo(treino.id, exercicio.id, `https://www.youtube.com/watch?v=${id}`);
      this.treinos.update(itens => itens.map(item => item.id === atualizado.id ? atualizado : item));
      this.videoManual.setValue('');
      this.academiaMensagem.set('Vídeo salvo para este exercício. Confira a execução antes de usar.');
    } catch { this.academiaMensagem.set('Não foi possível salvar este vídeo.'); }
  }

  idVideo(url: string | null): string | null { return url?.match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] ?? null; }
  encodeURIComponent(valor: string): string { return encodeURIComponent(valor); }
  abrirVideo(url: string | null): void { this.videoAberto.set(this.idVideo(url)); }

  moverTreino(treino: Treino, data: string): void {
    if (!treino.id || !data) return;
    void this.academiaApi.mover(treino.id, data).then(() => this.carregarTreinos()).catch(() => this.academiaMensagem.set('Não foi possível mudar a data do treino.'));
  }

  private async moverTreinoPorVoz(origem: string, destino: string): Promise<string> {
    const dias: Record<string, number> = { segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6, domingo: 0 };
    const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split('-')[0].trim();
    const diaOrigem = dias[normalizar(origem)];
    if (diaOrigem === undefined) return 'Diga o dia de origem do treino, como sexta.';
    const agora = new Date();
    const segunda = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - ((agora.getDay() + 6) % 7));
    const domingo = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 6);
    const formato = (data: Date) => new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
    const candidatos = this.treinos().filter(treino => treino.data >= formato(segunda) && treino.data <= formato(domingo) && new Date(`${treino.data}T12:00:00`).getDay() === diaOrigem);
    if (candidatos.length !== 1) return `Encontrei ${candidatos.length} treinos de ${origem}. Abra Academia e escolha qual mover.`;
    const data = normalizar(destino) === 'hoje' ? formato(agora) : /^\d{4}-\d{2}-\d{2}$/.test(destino) ? destino : '';
    if (!data || !candidatos[0].id) return 'Diga “hoje” ou uma data no formato ano-mês-dia.';
    await this.academiaApi.mover(candidatos[0].id, data);
    await this.carregarTreinos();
    return `Treino ${candidatos[0].titulo} movido para ${data}.`;
  }

  @HostListener('document:dragover', ['$event'])
  aoArrastar(evento: DragEvent): void {
    if (!this.autenticado() || !evento.dataTransfer?.types.includes('Files')) return;
    evento.preventDefault();
    this.arrastandoArquivo.set(true);
  }

  @HostListener('document:dragleave', ['$event'])
  aoSairArrasto(evento: DragEvent): void {
    if (!evento.relatedTarget) this.arrastandoArquivo.set(false);
  }

  @HostListener('document:drop', ['$event'])
  aoSoltar(evento: DragEvent): void {
    if (!this.autenticado() || !evento.dataTransfer?.files.length) return;
    evento.preventDefault();
    this.arrastandoArquivo.set(false);
    const arquivos = [...evento.dataTransfer.files];
    if (arquivos[0].name.toLowerCase().endsWith('.ofx')) this.prepararArquivo(arquivos[0]);
    else this.prepararFotos(arquivos);
  }

  private iniciarImportacao(arquivo: File): void {
    if (this.financeiroImportando()) return;
    this.financeiroImportando.set(true); this.financeiroErro.set(''); this.financeiroMensagem.set('');
    this.selecionarModulo('financeiro', undefined, false);
    this.abaAtiva.set('Importar OFX');
    const inicio = Date.now();
    this.tempoImportacao.set(0);
    this.importacaoInterval = window.setInterval(() => this.tempoImportacao.set(Math.floor((Date.now() - inicio) / 1000)), 1000);
    void this.financeiroApi.importar(arquivo).then((resultado) => {
      const mensagem = `${resultado.importados} lançamento(s) importado(s). ${resultado.duplicados} duplicado(s) ignorado(s). Tempo: ${Math.max(1, Math.ceil((Date.now() - inicio) / 1000))} s.`;
      this.financeiroMensagem.set(mensagem);
      this.respostaComando.set(`${mensagem} Abra Financeiro > Importações para revisar as categorias.`);
      this.geminiLive.avisarImportacao(mensagem);
      this.arquivoPreparado.set(null);
      this.previaOfx.set(null);
      return Promise.all([this.carregarFinanceiro(), this.carregarImportacoes(), this.avaliarNotificacoes()]);
    }).catch((erro: unknown) => { const mensagem = erro instanceof Error ? erro.message : 'Não foi possível importar o OFX.'; this.financeiroErro.set(mensagem); this.respostaComando.set(mensagem); }).finally(() => {
      this.financeiroImportando.set(false);
      if (this.importacaoInterval) clearInterval(this.importacaoInterval);
      this.importacaoInterval = undefined;
    });
  }

  enviarComando(evento: Event): void {
    evento.preventDefault();
    const texto = this.comando.value.trim();
    if (!texto || !this.autenticado()) return;
    this.comando.setValue('');
    this.modoEntrada.set('TEXTO');
    this.respostaChatPendente = true;
    this.mensagensChat.update(mensagens => [...mensagens, { papel: 'usuario', texto }, { papel: 'zyven', texto: 'Aguardando resposta…' }]);
    this.rolarChat();
    const normalizado = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/\b(segunda|terca|quarta|quinta|sexta|sabado|domingo)(-feira)?\s*:/.test(normalizado) && /\b\d+\s*x\s*\d+\b/.test(normalizado)) {
      this.textoPlano.setValue(texto);
      void this.lerTextoTreino(texto).then(mensagem => this.respostaComando.set(mensagem));
      return;
    }
    if (/\bofx\b/.test(normalizado) && /\b(importar|importe|ler|leia|abrir|abra|carregar|envie)\b/.test(normalizado)) {
      void this.prepararImportacao();
      return;
    }
    if (/\b(treinos?|fotos?)\b/.test(normalizado) && /\b(importar|importe|ler|leia|carregar)\b/.test(normalizado) && this.fotosPreparadas().length) {
      void this.lerFotosTreino().then(mensagem => this.respostaComando.set(mensagem));
      return;
    }
    if (this.previaOfx() && /^(sim|pode|confirmo|confirma|importa|importe)(\b|\s)/.test(normalizado)) {
      this.confirmarImportacao();
      return;
    }
    if (this.previaTreinos().length && /^(sim|pode|confirmo|confirma|importa|importe)(\b|\s)/.test(normalizado)) {
      void (this.origemPrevia() === 'TEXTO' ? this.confirmarTextoTreino() : this.confirmarFotosTreino()).then(mensagem => this.respostaComando.set(mensagem));
      return;
    }
    if ((this.previaOfx() || this.previaTreinos().length) && /^(nao|agora nao|cancela|cancelar)\b/.test(normalizado)) {
      this.cancelarPrevia(); this.previaTreinos.set([]); this.respostaComando.set('Importação cancelada. O anexo continua preparado.');
      return;
    }
    if (/\b(revisar|revisao|conferir|conferencia)\b/.test(normalizado)) {
      void this.abrirRevisaoPorVoz();
      return;
    }
    this.respostaComando.set('');
    void this.geminiLive.enviarTexto(texto).catch((erro: unknown) => {
      this.respostaComando.set(erro instanceof Error ? erro.message : 'Não foi possível enviar a mensagem.');
    });
  }

  teclaChat(evento: KeyboardEvent): void {
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.isComposing) {
      evento.preventDefault();
      (evento.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
    }
  }

  iniciarVoz(): void {
    this.respostaChatPendente = false;
    this.modoEntrada.set('VOZ');
    this.respostaComando.set('');
    void this.geminiLive.connect('VOZ').catch((erro: unknown) => {
      this.audioState.status.set('VOZ INDISPONÍVEL');
      const status = erro instanceof HttpErrorResponse ? erro.status : -1;
      this.respostaComando.set(status === 503
        ? 'A voz precisa da chave Gemini configurada neste ambiente. Você pode usar Digitar para importar OFX.'
        : erro instanceof DOMException && erro.name === 'NotAllowedError'
          ? 'Permita o acesso ao microfone no navegador para usar a voz.'
          : 'Não foi possível iniciar a voz. Tente novamente.');
    });
  }

  usarTexto(): void {
    this.modoEntrada.set('TEXTO');
    this.geminiLive.usarTexto();
    this.respostaComando.set('');
  }

  abrirChat(): void { this.chatAberto.set(true); this.rolarChat(); }
  fecharChat(): void { this.chatAberto.set(false); }
  iniciarArrasteNucleo(evento: PointerEvent): void { this.inicioArrasteNucleo = evento.clientY; }
  finalizarArrasteNucleo(evento: PointerEvent): void {
    if (this.inicioArrasteNucleo - evento.clientY > 28) this.abrirChat();
    this.inicioArrasteNucleo = 0;
  }
  private rolarChat(): void {
    requestAnimationFrame(() => {
      const mensagens = document.querySelector<HTMLElement>('.chat-messages');
      if (mensagens) mensagens.scrollTop = mensagens.scrollHeight;
    });
  }

  private abrirImportacao(): void {
    if (!this.autenticado()) return;
    this.selecionarModulo('financeiro', undefined, false);
    this.abaAtiva.set('Importar OFX');
    this.geminiLive.respostaTexto.set('');
    this.respostaComando.set('Solte ou selecione um arquivo OFX. Depois peça a prévia por voz ou texto.');
  }

  async prepararImportacao(): Promise<string> {
    const arquivo = this.arquivoPreparado();
    if (!arquivo) { this.abrirImportacao(); return 'Não há arquivo OFX preparado. Peça a Tuco para soltar um arquivo na tela.'; }
    if (this.financeiroImportando()) return 'A importação já está em andamento.';
    if (this.previaOfx()) return this.perguntaPrevia(this.previaOfx()!);
    if (this.previaCarregando()) return 'Ainda estou lendo a prévia do arquivo.';
    this.previaCarregando.set(true);
    this.financeiroErro.set('');
    this.selecionarModulo('financeiro', undefined, false);
    this.abaAtiva.set('Importar OFX');
    try {
      const previa = await this.financeiroApi.previa(arquivo);
      if (this.arquivoPreparado() !== arquivo) return 'O arquivo preparado mudou. Peça uma nova prévia.';
      this.previaOfx.set(previa);
      const pergunta = this.perguntaPrevia(previa);
      this.respostaComando.set(pergunta);
      return pergunta;
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Não foi possível ler o OFX.';
      this.financeiroErro.set(mensagem);
      return mensagem;
    } finally { this.previaCarregando.set(false); }
  }

  confirmarImportacao(): string {
    const arquivo = this.arquivoPreparado();
    if (!arquivo || !this.previaOfx()) return 'Não há prévia aguardando confirmação. Primeiro leia o OFX.';
    if (this.financeiroImportando()) return 'A importação já está em andamento.';
    this.previaOfx.set(null);
    this.iniciarImportacao(arquivo);
    return 'Importação iniciada. A aplicação avisará quando terminar; não declare a conclusão antes disso.';
  }

  cancelarPrevia(): void { this.previaOfx.set(null); this.respostaComando.set('Importação cancelada. O arquivo continua preparado.'); }

  private perguntaPrevia(previa: PreviaOfx): string {
    return `Encontrei ${previa.transacoes} transações no OFX, de ${previa.inicio} a ${previa.fim}. Tuco, posso importar e analisar as categorias?`;
  }

  private async abrirRevisaoPorVoz(): Promise<string> {
    this.selecionarModulo('financeiro', undefined, false);
    await this.abrirImportacoes();
    return 'A revisão das importações está aberta. Continue ouvindo os comandos de Tuco enquanto ele confere os lançamentos.';
  }

  private async aplicarRegraPorVoz(termo: string, descricao: string, categoria: string): Promise<string> {
    if (!this.categorias.some(item => item.valor === categoria)) return 'Categoria não reconhecida. Peça uma categoria financeira válida.';
    const resultado = await this.financeiroApi.regraEmLote(termo, descricao, categoria as CategoriaFinanceira);
    await Promise.all([this.carregarFinanceiro(), this.carregarImportacoes()]);
    const mensagem = `${resultado.afetados} lançamento(s) com “${resultado.termo}” ajustado(s) para ${resultado.descricao}, categoria ${this.rotuloCategoria(resultado.categoria)}. A regra foi salva para os próximos extratos.`;
    this.financeiroMensagem.set(mensagem);
    return mensagem;
  }

  private async consultarLancamentosPorVoz(termo: string, pagina: number): Promise<string> {
    const consulta = await this.financeiroApi.consultarLancamentos(termo, pagina);
    if (consulta.termo && consulta.total > 0) {
      this.termoRevisao.set(consulta.termo);
      this.selecionarModulo('financeiro', undefined, false);
      await this.abrirImportacoes();
    } else if (!consulta.termo) {
      this.termoRevisao.set('');
      if (this.importacoesAbertas()) await this.carregarImportacoes();
    }
    const cabecalho = `${consulta.total} lançamento(s) salvo(s)${consulta.termo ? ` com “${consulta.termo}”` : ''}; ${consulta.pendentesrevisao} pendente(s) de revisão. Página ${consulta.pagina + 1} de ${Math.max(1, consulta.totalpaginas)}.`;
    if (!consulta.lancamentos.length) return `${cabecalho} Nenhum lançamento nesta página.`;
    const itens = consulta.lancamentos.map(item => `${item.data}: ${item.descricao}, ${this.formatarValor(item.valor)}, ${item.categoria ? this.rotuloCategoria(item.categoria) : 'sem categoria'}, ${item.status === 'LANCADO' ? 'confirmado' : 'pendente'}.`);
    return `${cabecalho}\n${itens.join('\n')}`;
  }

  private async renomearSelecionadosPorVoz(descricao: string): Promise<string> {
    const termo = this.termoRevisao();
    if (!termo) return 'Primeiro peça para localizar os lançamentos por um termo, como Uber.';
    const resultado = await this.financeiroApi.renomearPendentes(termo, descricao);
    await this.carregarImportacoes();
    return `${resultado.afetados} lançamento(s) pendente(s) com ${termo} renomeado(s) para ${descricao}. A tela foi atualizada; ainda aguardam confirmação.`;
  }

  private async categorizarSelecionadosPorVoz(categoria: string): Promise<string> {
    const termo = this.termoRevisao();
    if (!termo) return 'Primeiro peça para localizar os lançamentos por um termo, como Uber.';
    if (!this.categorias.some(item => item.valor === categoria)) return 'Informe uma categoria financeira válida.';
    const resultado = await this.financeiroApi.categorizarPendentes(termo, categoria as CategoriaFinanceira);
    await this.carregarImportacoes();
    return `${resultado.afetados} lançamento(s) pendente(s) com ${termo} classificado(s) como ${this.rotuloCategoria(categoria as CategoriaFinanceira)}. A tela foi atualizada; ainda aguardam confirmação.`;
  }

  private async confirmarSelecionadosPorVoz(categoria: string): Promise<string> {
    const termo = this.termoRevisao();
    if (!termo) return 'Primeiro peça para localizar os lançamentos por um termo, como Uber.';
    if (categoria && !this.categorias.some(item => item.valor === categoria)) return 'Informe uma categoria financeira válida.';
    const resultado = await this.financeiroApi.confirmarPendentes(termo, categoria ? categoria as CategoriaFinanceira : undefined);
    await Promise.all([this.carregarFinanceiro(), this.carregarImportacoes()]);
    return `${resultado.afetados} lançamento(s) com ${termo} confirmado(s) como gastos em ${this.rotuloCategoria(resultado.categoria)}. A regra será usada nos próximos extratos. A tela foi atualizada.`;
  }

  limparFiltroRevisao(): void { this.termoRevisao.set(''); void this.carregarImportacoes(); }

  async abrirImportacoes(): Promise<void> {
    this.financeiroErro.set('');
    this.importacoesAbertas.set(true);
    await this.carregarImportacoes();
  }
  fecharImportacoes(): void { this.importacoesAbertas.set(false); }
  fecharImportacoesExterno(evento: MouseEvent): void { if (evento.target === evento.currentTarget) this.fecharImportacoes(); }
  private async carregarImportacoes(): Promise<void> {
    try { this.importacoes.set(await this.financeiroApi.importacoes(this.termoRevisao())); }
    catch { this.financeiroErro.set('Não foi possível carregar as importações.'); }
  }

  confirmarLancamento(lancamento: LancamentoFinanceiro, evento: Event): void {
    const categoria = (evento.target as HTMLSelectElement).value as CategoriaFinanceira;
    if (!categoria) return;
    this.financeiroErro.set('');
    void this.financeiroApi.confirmar(lancamento.id, categoria).then(() => {
      this.financeiroMensagem.set('Categoria confirmada. A regra será usada nas próximas importações.');
      return Promise.all([this.carregarFinanceiro(), this.carregarImportacoes()]);
    }).catch((erro: unknown) => this.financeiroErro.set(erro instanceof Error ? erro.message : 'Não foi possível confirmar o lançamento.'));
  }

  confirmarSugestao(lancamento: LancamentoFinanceiro): void {
    if (!lancamento.categoria) return;
    this.financeiroErro.set('');
    void this.financeiroApi.confirmar(lancamento.id, lancamento.categoria)
      .then(() => Promise.all([this.carregarFinanceiro(), this.carregarImportacoes()]))
      .catch((erro: unknown) => this.financeiroErro.set(erro instanceof Error ? erro.message : 'Não foi possível confirmar a categoria.'));
  }

  salvarDescricao(lancamento: LancamentoFinanceiro, descricao: string): void {
    this.financeiroErro.set('');
    void this.financeiroApi.renomear(lancamento.id, descricao)
      .then(() => this.carregarImportacoes())
      .catch((erro: unknown) => this.financeiroErro.set(erro instanceof Error ? erro.message : 'Não foi possível salvar a descrição.'));
  }

  aplicarRegraManual(evento: Event): void {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget as HTMLFormElement);
    this.financeiroErro.set('');
    void this.aplicarRegraPorVoz(String(dados.get('termo') ?? ''), String(dados.get('descricao') ?? ''), String(dados.get('categoria') ?? ''))
      .catch((erro: unknown) => this.financeiroErro.set(erro instanceof Error ? erro.message : 'Não foi possível aplicar a regra.'));
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
  fecharComEscape(): void { if (this.videoAberto()) this.videoAberto.set(null); else if (this.cadastroFaceId()) this.cadastroFaceId.set(false); else if (this.notificacoesAbertas()) this.notificacoesAbertas.set(false); else if (this.importacoesAbertas()) this.fecharImportacoes(); else if (this.modalAberto()) this.fecharModal(); else if (this.chatAberto()) this.fecharChat(); else this.fecharPainel(); }

  abrirNotificacoes(): void { this.notificacoesAbertas.set(true); void this.avaliarNotificacoes(); }
  fecharNotificacoesExterno(evento: MouseEvent): void { if (evento.target === evento.currentTarget) this.notificacoesAbertas.set(false); }
  async avaliarNotificacoes(): Promise<void> {
    try {
      const [notificacoes, preferencias] = await Promise.all([this.notificacaoApi.avaliar(), this.notificacaoApi.preferencias()]);
      this.notificacoes.set(notificacoes);
      this.preferenciasNotificacao.set(preferencias);
      void this.exibirNotificacoesNovas(notificacoes);
    } catch { this.notificacaoMensagem.set('Não foi possível atualizar as notificações.'); }
  }
  salvarMeta(evento: Event): void {
    evento.preventDefault();
    const campo = (evento.currentTarget as HTMLFormElement).elements.namedItem('metadiaria') as HTMLInputElement;
    const valor = campo.value.trim() ? Number(campo.value) : null;
    void this.notificacaoApi.meta(valor).then(preferencias => { this.preferenciasNotificacao.set(preferencias); return this.avaliarNotificacoes(); })
      .catch(() => this.notificacaoMensagem.set('Não foi possível salvar a meta diária.'));
  }
  registrarAgua(quantidade = 500): void {
    void this.notificacaoApi.agua(quantidade).then(preferencias => { this.preferenciasNotificacao.set(preferencias); return this.avaliarNotificacoes(); })
      .catch(() => this.notificacaoMensagem.set('Não foi possível registrar a água.'));
  }
  descartarNotificacao(item: Notificacao): void {
    void this.notificacaoApi.descartar(item.id).then(() => this.avaliarNotificacoes())
      .catch(() => this.notificacaoMensagem.set('Não foi possível dispensar o lembrete.'));
  }
  ativarNotificacoes(): void {
    if (typeof Notification === 'undefined') { this.notificacaoMensagem.set('Notificações indisponíveis neste navegador.'); return; }
    void Notification.requestPermission().then(permissao => {
      this.notificacoesPermitidas.set(permissao === 'granted');
      if (permissao === 'granted') void this.avaliarNotificacoes();
      else this.notificacaoMensagem.set('Permissão de notificações não concedida. Os lembretes seguem visíveis no Zyven.');
    });
  }
  private async exibirNotificacoesNovas(itens: Notificacao[]): Promise<void> {
    if (!this.notificacoesPermitidas() || !('serviceWorker' in navigator)) return;
    const registro = await navigator.serviceWorker.ready;
    for (const item of itens.filter(it => it.estado === 'PENDENTE')) {
      const chave = `zyven-notificacao-${item.id}`;
      if (localStorage.getItem(chave)) continue;
      const acao = item.tipo === 'AGUA' ? [{ action: 'agua500', title: 'Bebi 500 ml' }] : [{ action: 'abrir', title: 'Abrir Zyven' }];
      await registro.showNotification(item.titulo, {
        body: item.mensagem, icon: '/icons/zyven-192.png', tag: item.id,
        actions: acao,
        data: { onActionClick: { default: { operation: 'focusLastFocusedOrOpen', url: '/?notificacoes=1' }, agua500: { operation: 'navigateLastFocusedOrOpen', url: '/?acao=agua500' }, abrir: { operation: 'focusLastFocusedOrOpen', url: '/?notificacoes=1' } } },
      } as NotificationOptions);
      localStorage.setItem(chave, '1');
    }
  }

  private async recuperarSessao(): Promise<void> {
    try {
      if (this.passkeyApi.instalado && this.passkeyApi.temChaveNesteDispositivo()) {
        await this.entrarComFaceId(true);
      } else {
        this.iniciarSessao((await this.autenticacaoApi.sessao()).login);
      }
    } catch {
      // Sem sessão ativa: o formulário de acesso será exibido.
    } finally {
      this.acessoCarregando.set(false);
    }
  }
  private iniciarSessao(login: string): void {
    if (this.autenticado()) return;
    this.usuario.set(login);
    this.autenticado.set(true);
    this.mensagensChat.set([{ papel: 'zyven', texto: 'Olá Tuco.' }]);
    requestAnimationFrame(() => this.iniciarNucleoVisual());
    this.geminiLive.solicitarSaudacaoInicial();
    this.iniciarVoz();
    void this.carregarFinanceiro();
    void this.carregarTreinos();
    void this.avaliarNotificacoes();
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get('acao') === 'agua500') { this.registrarAgua(500); window.history.replaceState(null, '', '/'); }
    else if (parametros.has('notificacoes')) { this.notificacoesAbertas.set(true); window.history.replaceState(null, '', '/'); }
  }

}
