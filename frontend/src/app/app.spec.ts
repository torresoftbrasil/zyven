import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { FinanceiroApi } from './financeiro/financeiro-api';
import { AcademiaApi } from './academia/academia-api';
import { AutenticacaoApi } from './core/autenticacao/autenticacao-api';
import { PasskeyApi } from './core/autenticacao/passkey-api';
import { vi } from 'vitest';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Zyven brand', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Z Y V E N');
  });

  it('mostra o painel bento e abre a conversa pelo núcleo flutuante', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    app.autenticado.set(true);
    fixture.detectChanges();
    const tela = fixture.nativeElement as HTMLElement;
    expect(tela.querySelector('#tituloPainelDia')?.textContent).toBe('Olá Tuco.');
    expect(tela.querySelectorAll('.bento-card')).toHaveLength(5);
    (tela.querySelector('.floating-voice') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(tela.querySelector('.chat-panel')).toBeTruthy();
  });

  it('aguarda a checagem da sessão antes de mostrar o login', async () => {
    let rejeitar!: (motivo: Error) => void;
    const sessaoPendente = new Promise<{ login: string }>((_, reject) => { rejeitar = reject; });
    vi.spyOn(TestBed.inject(AutenticacaoApi), 'sessao').mockReturnValue(sessaoPendente);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const tela = fixture.nativeElement as HTMLElement;
    expect(tela.querySelector('.access-intro')).toBeTruthy();
    expect(tela.querySelector('.access-lock')).toBeNull();

    rejeitar(new Error('Sem sessão'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(tela.querySelector('.access-intro')).toBeNull();
    expect(tela.querySelector('.access-lock')).toBeTruthy();
  });

  it('pede Face ID antes de abrir uma sessão salva no app instalado', async () => {
    const passkey = TestBed.inject(PasskeyApi);
    Object.defineProperty(passkey, 'instalado', { value: true });
    vi.spyOn(passkey, 'temChaveNesteDispositivo').mockReturnValue(true);
    let rejeitarBiometria!: (motivo: Error) => void;
    const biometriaPendente = new Promise<void>((_, reject) => { rejeitarBiometria = reject; });
    const entrar = vi.spyOn(passkey, 'entrar').mockReturnValue(biometriaPendente);
    const sessao = vi.spyOn(TestBed.inject(AutenticacaoApi), 'sessao');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(entrar).toHaveBeenCalledOnce();
    expect(sessao).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('.access-intro')).toBeTruthy();

    rejeitarBiometria(new Error('Cancelado'));
    await vi.waitFor(() => expect(fixture.componentInstance.acessoCarregando()).toBe(false));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.access-lock')).toBeTruthy();
  });

  it('lê a prévia e espera confirmação antes de importar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    const financeiro = TestBed.inject(FinanceiroApi);
    const importar = vi.spyOn(financeiro, 'importar').mockResolvedValue({ importacaoid: 'teste', importados: 1, duplicados: 0, pendentes: [] });
    vi.spyOn(financeiro, 'previa').mockResolvedValue({ transacoes: 1, inicio: '2026-11-15', fim: '2026-11-15' });
    vi.spyOn(financeiro, 'resumo').mockResolvedValue({ lancados: 0, pendentesrevisao: 0, pendentes: [] });
    vi.spyOn(financeiro, 'importacoes').mockResolvedValue([]);
    app.autenticado.set(true);

    app.prepararArquivo(new File(['<OFX>'], 'teste.ofx'));
    await app.prepararImportacao();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(importar).not.toHaveBeenCalled();
    expect(app.arquivoPreparado()?.name).toBe('teste.ofx');
    expect(app.previaOfx()?.transacoes).toBe(1);

    app.confirmarImportacao();
    expect(importar).toHaveBeenCalledOnce();
  });

  it('prepara fotos de treino sem importar antes da confirmação', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    app.autenticado.set(true);
    const academia = TestBed.inject(AcademiaApi);
    const exercicio = { id: null, nome: 'Agachamento', series: '4', repeticoes: '10', observacao: '', pausasegundos: 60, carga: null, seriesconcluidas: 0, videourl: null, seriesregistradas: [] };
    const previa = vi.spyOn(academia, 'previa').mockResolvedValue([{ id: null, data: '2026-11-16', titulo: 'Pernas', exercicios: [exercicio] }]);
    const confirmar = vi.spyOn(academia, 'confirmar').mockResolvedValue([{ id: 'treino-1', data: '2026-11-16', titulo: 'Pernas', exercicios: [exercicio] }]);
    vi.spyOn(academia, 'listar').mockResolvedValue([]);
    app['prepararFotos']([new File(['foto'], 'treino.png', { type: 'image/png' })]);
    expect(previa).not.toHaveBeenCalled();
    expect(confirmar).not.toHaveBeenCalled();
    await app.lerFotosTreino();
    expect(app.previaTreinos()).toHaveLength(1);
    expect(confirmar).not.toHaveBeenCalled();
    await app.confirmarFotosTreino();
    expect(confirmar).toHaveBeenCalledOnce();
  });

  it('analisa um plano enviado no chat e só salva após confirmação', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    app.autenticado.set(true);
    const academia = TestBed.inject(AcademiaApi);
    const exercicio = { id: null, nome: 'Supino reto', series: '4', repeticoes: '12', observacao: '', pausasegundos: 60, carga: null, seriesconcluidas: 0, videourl: null, seriesregistradas: [] };
    const previa = vi.spyOn(academia, 'previaTexto').mockResolvedValue([{ id: null, data: '2026-11-30', titulo: 'Peito', exercicios: [exercicio] }]);
    const confirmar = vi.spyOn(academia, 'confirmarTexto').mockResolvedValue([]);
    const texto = 'Segunda-feira:\nSupino reto:\n4 x 12 ir: 01:00';
    app.comando.setValue(texto);
    app.enviarComando(new Event('submit'));
    await vi.waitFor(() => expect(app.previaTreinos()).toHaveLength(1));
    expect(previa).toHaveBeenCalledWith(texto);
    expect(confirmar).not.toHaveBeenCalled();
    await app.confirmarTextoTreino();
    expect(confirmar).toHaveBeenCalledOnce();
  });
});
