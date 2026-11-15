import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { FinanceiroApi } from './financeiro/financeiro-api';
import { AcademiaApi } from './academia/academia-api';
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
    const previa = vi.spyOn(academia, 'previa').mockResolvedValue([{ id: null, data: '2026-11-16', titulo: 'Pernas', exercicios: [{ nome: 'Agachamento', series: '4', repeticoes: '10', observacao: '' }] }]);
    const confirmar = vi.spyOn(academia, 'confirmar').mockResolvedValue([{ id: 'treino-1', data: '2026-11-16', titulo: 'Pernas', exercicios: [{ nome: 'Agachamento', series: '4', repeticoes: '10', observacao: '' }] }]);
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
});
