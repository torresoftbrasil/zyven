import { AfterViewInit, Component, computed, HostListener, NgZone, OnDestroy, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { VoiceWaveform } from './shared/voice-waveform/voice-waveform';
import { GeminiLive } from './core/gemini/gemini-live';
import { ZyvenAudioState } from './core/audio/zyven-audio-state';
import { CategoriaFinanceira, FinanceiroApi, ImportacaoFinanceira, LancamentoFinanceiro, PreviaOfx } from './financeiro/financeiro-api';
import { AutenticacaoApi } from './core/autenticacao/autenticacao-api';
import { AcademiaApi, Treino } from './academia/academia-api';
import { PasskeyApi } from './core/autenticacao/passkey-api';
import { Notificacao, NotificacaoApi, PreferenciasNotificacao } from './notificacao/notificacao-api';

type ModuloId = 'inicio' | 'financeiro' | 'academia' | 'agenda' | 'tarefas' | 'integracoes';

interface Modulo { id: ModuloId; codigo: string; nome: string; }
interface Metrica { rotulo: string; valor: string; detalhe: string; }
interface Atividade { titulo: string; tipo: string; valor: string; }

@Component({
  selector: 'app-root',
  imports: [VoiceWaveform, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
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
  readonly abas = computed(() => this.moduloAtivo() === 'financeiro' ? ['Visão geral', 'Registros', 'Importar OFX'] : this.moduloAtivo() === 'academia' ? ['Treinos', 'Importar fotos'] : ['Visão geral', 'Registros', 'Análises']);
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
  readonly revisaoSemSugestao = computed(() => this.importacoes().flatMap(importacao => importacao.lancamentos.filter(item => item.status === 'PENDENTE_REVISAO' && !item.categoria).map(item => ({ ...item, nomearquivo: importacao.nomearquivo }))));
  readonly revisaoComSugestao = computed(() => this.importacoes().flatMap(importacao => importacao.lancamentos.filter(item => item.status === 'PENDENTE_REVISAO' && !!item.categoria).map(item => ({ ...item, nomearquivo: importacao.nomearquivo }))));
  readonly revisaoConfirmados = computed(() => this.importacoes().flatMap(importacao => importacao.lancamentos.filter(item => item.status === 'LANCADO').map(item => ({ ...item, nomearquivo: importacao.nomearquivo }))));
  readonly categorias: { valor: CategoriaFinanceira; rotulo: string }[] = [
    { valor: 'ALIMENTACAO', rotulo: 'Alimentação' }, { valor: 'MORADIA', rotulo: 'Moradia' }, { valor: 'TRANSPORTE', rotulo: 'Transporte' }, { valor: 'SAUDE', rotulo: 'Saúde' }, { valor: 'LAZER', rotulo: 'Lazer' }, { valor: 'ASSINATURAS', rotulo: 'Assinaturas' }, { valor: 'EDUCACAO', rotulo: 'Educação' }, { valor: 'COMPRAS', rotulo: 'Compras' }, { valor: 'TARIFAS', rotulo: 'Tarifas' }, { valor: 'TRANSFERENCIAS', rotulo: 'Transferências' }, { valor: 'RECEITAS', rotulo: 'Receitas' }, { valor: 'OUTROS', rotulo: 'Outros' },
  ];
  readonly horario = signal(this.formatarHorario());
  readonly autenticado = signal(false);
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

  constructor(
    private readonly geminiLive: GeminiLive,
    private readonly financeiroApi: FinanceiroApi,
    private readonly autenticacaoApi: AutenticacaoApi,
    private readonly academiaApi: AcademiaApi,
    readonly passkeyApi: PasskeyApi,
    private readonly notificacaoApi: NotificacaoApi,
    readonly audioState: ZyvenAudioState,
    private readonly zone: NgZone,
  ) {
    this.clockInterval = window.setInterval(() => this.horario.set(this.formatarHorario()), 1000);
    this.notificacaoInterval = window.setInterval(() => { if (this.autenticado()) void this.avaliarNotificacoes(); }, 15 * 60 * 1000);
    void this.recuperarSessao();
    this.geminiLive.definirAcoesFinanceiras({
      prepararImportacao: () => this.prepararImportacao(),
      confirmarImportacao: () => this.confirmarImportacao(),
      abrirRevisao: () => this.abrirRevisaoPorVoz(),
      aplicarRegra: (termo, descricao, categoria) => this.aplicarRegraPorVoz(termo, descricao, categoria),
      cancelarImportacao: () => { this.cancelarPrevia(); return 'Prévia cancelada. O arquivo continua preparado.'; },
      prepararTreinos: () => this.lerFotosTreino(),
      confirmarTreinos: () => this.confirmarFotosTreino(),
      moverTreino: (origem, destino) => this.moverTreinoPorVoz(origem, destino),
    });
  }

  ngAfterViewInit(): void {
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
          angulo += intervalo * (Math.PI * 2 / 180_000) * (sobFoco ? .08 : 1);
          const largura = nav.clientWidth;
          const altura = nav.clientHeight;
          const celular = largura <= 650;
          const raioX = celular ? Math.min(largura * .3, 130) : Math.min(largura * .37, 900);
          const raioY = celular ? Math.min(altura * .12, 118) : Math.min(altura * .29, 280);
          for (const botao of nav.querySelectorAll<HTMLElement>('.orbit-option')) {
            const fase = fases[botao.dataset['module'] ?? ''] ?? 0;
            const posicao = angulo + fase * Math.PI / 180;
            const profundidade = Math.sin(posicao);
            const x = Math.cos(posicao) * raioX;
            const y = Math.sin(posicao) * raioY;
            const z = profundidade * (celular ? 22 : 55);
            const escala = 1 + profundidade * .12;
            botao.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) scale(${escala.toFixed(3)})`;
            botao.style.zIndex = profundidade >= 0 ? '3' : '1';
          }
        }
        ultimoTempo = tempo;
        this.orbitaFrame = requestAnimationFrame(animar);
      };
      this.orbitaFrame = requestAnimationFrame(animar);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.focoFrame);
    cancelAnimationFrame(this.orbitaFrame);
    clearInterval(this.clockInterval);
    clearInterval(this.notificacaoInterval);
    if (this.importacaoInterval) clearInterval(this.importacaoInterval);
    void this.geminiLive.disconnect();
  }

  selecionarModulo(modulo: ModuloId, evento?: Event, atualizarVoz = true): void {
    evento?.preventDefault();
    if (modulo === 'inicio') { this.fecharPainel(); return; }
    this.moduloAtivo.set(modulo);
    if (atualizarVoz) void this.geminiLive.definirModulo(modulo).catch(() => this.respostaComando.set('Não foi possível atualizar o contexto da voz.'));
    this.abaAtiva.set(modulo === 'academia' ? 'Treinos' : 'Visão geral');
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
      }
    });
  }

  limparFoco(evento: PointerEvent): void {
    cancelAnimationFrame(this.focoFrame);
    const alvo = evento.currentTarget as HTMLElement;
    alvo.style.setProperty('--foco-opacidade', '0');
    for (const botao of alvo.querySelectorAll<HTMLElement>('.orbit-option')) botao.style.setProperty('--luz', '.55');
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
      this.autenticado.set(false);
      this.usuario.set('');
      this.arquivoPreparado.set(null);
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

  entrarComFaceId(automatico = false): void {
    if (this.autenticando()) return;
    this.autenticando.set(true);
    this.loginErro.set('');
    void this.passkeyApi.entrar(this.passkeyApi.temChaveNesteDispositivo())
      .then(() => this.autenticacaoApi.sessao()).then(sessao => this.iniciarSessao(sessao.login))
      .catch((erro: unknown) => this.loginErro.set(automatico
        ? 'Toque em ENTRAR COM FACE ID para confirmar neste iPhone, ou use sua senha.'
        : erro instanceof Error ? erro.message : 'Não foi possível entrar com Face ID.'))
      .finally(() => this.autenticando.set(false));
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
      this.abaAtiva.set('Treinos');
      const mensagem = `${salvos.length} treino(s) importado(s). Confira as datas e exercícios na Academia.`;
      this.academiaMensagem.set(mensagem);
      void this.avaliarNotificacoes();
      return mensagem;
    } catch (erro) { const mensagem = erro instanceof Error ? erro.message : 'Não foi possível importar os treinos.'; this.academiaMensagem.set(mensagem); return mensagem; }
  }

  private async carregarTreinos(): Promise<void> {
    try { this.treinos.set(await this.academiaApi.listar()); }
    catch { this.academiaMensagem.set('Não foi possível carregar os treinos.'); }
  }

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
    const normalizado = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
      void this.confirmarFotosTreino().then(mensagem => this.respostaComando.set(mensagem));
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

  iniciarVoz(): void {
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

  async abrirImportacoes(): Promise<void> {
    this.financeiroErro.set('');
    this.importacoesAbertas.set(true);
    await this.carregarImportacoes();
  }
  fecharImportacoes(): void { this.importacoesAbertas.set(false); }
  fecharImportacoesExterno(evento: MouseEvent): void { if (evento.target === evento.currentTarget) this.fecharImportacoes(); }
  private async carregarImportacoes(): Promise<void> {
    try { this.importacoes.set(await this.financeiroApi.importacoes()); }
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
  fecharComEscape(): void { if (this.cadastroFaceId()) this.cadastroFaceId.set(false); else if (this.notificacoesAbertas()) this.notificacoesAbertas.set(false); else if (this.importacoesAbertas()) this.fecharImportacoes(); else if (this.modalAberto()) this.fecharModal(); else this.fecharPainel(); }

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

  private formatarHorario(): string { return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()); }
  private async recuperarSessao(): Promise<void> {
    try { this.iniciarSessao((await this.autenticacaoApi.sessao()).login); }
    catch {
      if (this.passkeyApi.instalado && this.passkeyApi.temChaveNesteDispositivo()) this.entrarComFaceId(true);
    }
  }
  private iniciarSessao(login: string): void {
    this.usuario.set(login);
    this.autenticado.set(true);
    this.iniciarVoz();
    void this.avaliarNotificacoes();
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get('acao') === 'agua500') { this.registrarAgua(500); window.history.replaceState(null, '', '/'); }
    else if (parametros.has('notificacoes')) { this.notificacoesAbertas.set(true); window.history.replaceState(null, '', '/'); }
  }

}
