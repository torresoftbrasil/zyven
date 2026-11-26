import { HttpClient } from '@angular/common/http';
import { LiveServerMessage } from '@google/genai';
import { ZyvenAudioState } from '../audio/zyven-audio-state';
import { GeminiLive } from './gemini-live';
import { vi } from 'vitest';

describe('GeminiLive', () => {
  it('fala a saudação inicial quando a sessão de voz fica pronta, uma única vez', () => {
    const live = new GeminiLive({} as HttpClient, new ZyvenAudioState());
    const enviar = vi.fn();
    live['session'] = { sendClientContent: enviar } as unknown as NonNullable<GeminiLive['session']>;
    live['startMicrophone'] = vi.fn().mockResolvedValue(undefined);
    live.solicitarSaudacaoInicial();
    expect(enviar).not.toHaveBeenCalled();

    live['handleMessage']({ setupComplete: true } as unknown as LiveServerMessage);
    live['handleMessage']({ setupComplete: true } as unknown as LiveServerMessage);
    expect(enviar).toHaveBeenCalledOnce();
    expect(enviar.mock.calls[0][0].turns[0].parts[0].text).toContain('Olá Tuco.');
  });

  it('encaminha a prévia mesmo quando a ferramenta chega antes da transcrição', async () => {
    const live = new GeminiLive({} as HttpClient, new ZyvenAudioState());
    const preparar = vi.fn().mockResolvedValue('Prévia pronta. Posso importar?');
    live.definirAcoesFinanceiras({ prepararImportacao: preparar, confirmarImportacao: () => '', abrirRevisao: async () => '', consultarLancamentos: async () => '', renomearSelecionados: async () => '', categorizarSelecionados: async () => '', confirmarSelecionados: async () => '', aplicarRegra: async () => '', cancelarImportacao: () => '', prepararTreinos: async () => '', confirmarTreinos: async () => '', moverTreino: async () => '' });

    live['handleMessage']({ toolCall: { functionCalls: [{ id: 'importar', name: 'solicitarImportacaoOfx', args: {} }] } } as LiveServerMessage);
    await Promise.resolve();

    expect(preparar).toHaveBeenCalledOnce();
  });

  it('impede confirmar o OFX no mesmo turno da prévia', async () => {
    const live = new GeminiLive({} as HttpClient, new ZyvenAudioState());
    const confirmar = vi.fn().mockReturnValue('Importação iniciada');
    const enviar = vi.fn();
    live.definirAcoesFinanceiras({ prepararImportacao: async () => 'Posso importar?', confirmarImportacao: confirmar, abrirRevisao: async () => '', consultarLancamentos: async () => '', renomearSelecionados: async () => '', categorizarSelecionados: async () => '', confirmarSelecionados: async () => '', aplicarRegra: async () => '', cancelarImportacao: () => '', prepararTreinos: async () => '', confirmarTreinos: async () => '', moverTreino: async () => '' });
    live['session'] = { sendToolResponse: enviar } as unknown as NonNullable<GeminiLive['session']>;
    live['handleMessage']({ toolCall: { functionCalls: [{ id: 'previa', name: 'solicitarImportacaoOfx', args: {} }] } } as LiveServerMessage);
    await new Promise(resolve => setTimeout(resolve, 0));
    live['handleMessage']({ toolCall: { functionCalls: [{ id: 'cedo', name: 'confirmarImportacaoOfx', args: {} }] } } as LiveServerMessage);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(confirmar).not.toHaveBeenCalled();
    live['handleMessage']({ serverContent: { turnComplete: true } } as LiveServerMessage);
    live['handleMessage']({ toolCall: { functionCalls: [{ id: 'agora', name: 'confirmarImportacaoOfx', args: {} }] } } as LiveServerMessage);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(confirmar).toHaveBeenCalledOnce();
  });

  it('consulta lançamentos processados durante a revisão', async () => {
    const live = new GeminiLive({} as HttpClient, new ZyvenAudioState());
    const consultar = vi.fn().mockResolvedValue('3 lançamentos salvos com UBER.');
    const enviar = vi.fn();
    live.definirAcoesFinanceiras({ prepararImportacao: async () => '', confirmarImportacao: () => '', abrirRevisao: async () => '', consultarLancamentos: consultar, renomearSelecionados: async () => '', categorizarSelecionados: async () => '', confirmarSelecionados: async () => '', aplicarRegra: async () => '', cancelarImportacao: () => '', prepararTreinos: async () => '', confirmarTreinos: async () => '', moverTreino: async () => '' });
    live['session'] = { sendToolResponse: enviar } as unknown as NonNullable<GeminiLive['session']>;
    live['handleMessage']({ toolCall: { functionCalls: [{ id: 'consulta', name: 'consultarLancamentosFinanceiros', args: { termo: 'uber', pagina: 0 } }] } } as unknown as LiveServerMessage);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(consultar).toHaveBeenCalledWith('uber', 0);
    expect(enviar).toHaveBeenCalledWith({ functionResponses: [{ id: 'consulta', name: 'consultarLancamentosFinanceiros', response: { output: '3 lançamentos salvos com UBER.' } }] });
  });
});
