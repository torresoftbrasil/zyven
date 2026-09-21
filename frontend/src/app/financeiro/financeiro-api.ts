import { Injectable } from '@angular/core';

export type CategoriaFinanceira = 'ALIMENTACAO' | 'MORADIA' | 'TRANSPORTE' | 'SAUDE' | 'LAZER' | 'ASSINATURAS' | 'EDUCACAO' | 'COMPRAS' | 'TARIFAS' | 'TRANSFERENCIAS' | 'RECEITAS' | 'OUTROS';

export interface LancamentoFinanceiro { id: string; data: string; valor: number; descricao: string; categoria: CategoriaFinanceira | null; origemcategoria: string; confianca: number | null; status: string; }
export interface ResumoFinanceiro { lancados: number; pendentesrevisao: number; pendentes: LancamentoFinanceiro[]; }
export interface ResultadoImportacao { importacaoid: string; importados: number; duplicados: number; pendentes: { lancamentoid: string; descricao: string }[]; }

@Injectable({ providedIn: 'root' })
export class FinanceiroApi {
  async resumo(): Promise<ResumoFinanceiro> { return this.request('/api/financeiro/resumo'); }
  async importar(arquivo: File): Promise<ResultadoImportacao> { const dados = new FormData(); dados.set('arquivo', arquivo); return this.request('/api/financeiro/importacoes/ofx', { method: 'POST', body: dados }); }
  async confirmar(id: string, categoria: CategoriaFinanceira): Promise<LancamentoFinanceiro> { return this.request(`/api/financeiro/lancamentos/${id}/confirmacao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoria }) }); }
  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const resposta = await fetch(url, init);
    if (!resposta.ok) { const erro = await resposta.json().catch(() => ({ message: 'Não foi possível concluir a operação.' })); throw new Error(erro.message ?? 'Não foi possível concluir a operação.'); }
    return resposta.json() as Promise<T>;
  }
}
