import { HttpClient } from '@angular/common/http';
import { LiveServerMessage } from '@google/genai';
import { ZyvenAudioState } from '../audio/zyven-audio-state';
import { GeminiLive } from './gemini-live';
import { vi } from 'vitest';

describe('GeminiLive', () => {
  it('encaminha a prévia mesmo quando a ferramenta chega antes da transcrição', async () => {
    const live = new GeminiLive({} as HttpClient, new ZyvenAudioState());
    const preparar = vi.fn().mockResolvedValue('Prévia pronta. Posso importar?');
    live.definirAcoesFinanceiras({ prepararImportacao: preparar, confirmarImportacao: () => '', abrirRevisao: async () => '', aplicarRegra: async () => '', cancelarImportacao: () => '', prepararTreinos: async () => '', confirmarTreinos: async () => '', moverTreino: async () => '' });

    live['handleMessage']({ toolCall: { functionCalls: [{ id: 'importar', name: 'solicitarImportacaoOfx', args: {} }] } } as LiveServerMessage);
    await Promise.resolve();

    expect(preparar).toHaveBeenCalledOnce();
  });

  it('impede confirmar o OFX no mesmo turno da prévia', async () => {
    const live = new GeminiLive({} as HttpClient, new ZyvenAudioState());
    const confirmar = vi.fn().mockReturnValue('Importação iniciada');
    const enviar = vi.fn();
    live.definirAcoesFinanceiras({ prepararImportacao: async () => 'Posso importar?', confirmarImportacao: confirmar, abrirRevisao: async () => '', aplicarRegra: async () => '', cancelarImportacao: () => '', prepararTreinos: async () => '', confirmarTreinos: async () => '', moverTreino: async () => '' });
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
});
