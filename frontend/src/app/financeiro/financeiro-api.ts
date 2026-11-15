import { Injectable } from '@angular/core';

export type CategoriaFinanceira = 'ALIMENTACAO' | 'MORADIA' | 'TRANSPORTE' | 'SAUDE' | 'LAZER' | 'ASSINATURAS' | 'EDUCACAO' | 'COMPRAS' | 'TARIFAS' | 'TRANSFERENCIAS' | 'RECEITAS' | 'OUTROS';

export interface LancamentoFinanceiro { id: string; data: string; valor: number; descricao: string; categoria: CategoriaFinanceira | null; origemcategoria: string; confianca: number | null; status: string; }
export interface ResumoFinanceiro { lancados: number; pendentesrevisao: number; pendentes: LancamentoFinanceiro[]; }
export interface ResultadoImportacao { importacaoid: string; importados: number; duplicados: number; pendentes: { lancamentoid: string; descricao: string }[]; }
export interface PreviaOfx { transacoes: number; inicio: string; fim: string; }
export interface ResultadoRegraEmLote { afetados: number; termo: string; descricao: string; categoria: CategoriaFinanceira; }
export interface ResultadoRevisaoEmLote { afetados: number; termo: string; descricao: string | null; categoria: CategoriaFinanceira | null; }
export interface ImportacaoFinanceira { id: string; nomearquivo: string; datacadastro: string; lancamentos: LancamentoFinanceiro[]; }
export interface ConsultaLancamentosFinanceiros { termo: string; total: number; pendentesrevisao: number; pagina: number; totalpaginas: number; lancamentos: LancamentoFinanceiro[]; }

@Injectable({ providedIn: 'root' })
export class FinanceiroApi {
  async resumo(): Promise<ResumoFinanceiro> { return this.request('/api/financeiro/resumo'); }
  async importar(arquivo: File): Promise<ResultadoImportacao> { const dados = new FormData(); dados.set('arquivo', arquivo); return this.request('/api/financeiro/importacoes/ofx', { method: 'POST', body: dados }); }
  async previa(arquivo: File): Promise<PreviaOfx> { const dados = new FormData(); dados.set('arquivo', arquivo); return this.request('/api/financeiro/importacoes/ofx/previa', { method: 'POST', body: dados }); }
  async importacoes(termo = ''): Promise<ImportacaoFinanceira[]> { return this.request(`/api/financeiro/importacoes?${new URLSearchParams({ termo })}`); }
  async consultarLancamentos(termo = '', pagina = 0): Promise<ConsultaLancamentosFinanceiros> {
    const parametros = new URLSearchParams({ termo, pagina: String(pagina) });
    return this.request(`/api/financeiro/lancamentos/consulta?${parametros}`);
  }
  async confirmar(id: string, categoria: CategoriaFinanceira): Promise<LancamentoFinanceiro> { return this.request(`/api/financeiro/lancamentos/${id}/confirmacao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoria }) }); }
  async renomear(id: string, descricao: string): Promise<LancamentoFinanceiro> { return this.request(`/api/financeiro/lancamentos/${id}/descricao`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ descricao }) }); }
  async regraEmLote(termo: string, descricao: string, categoria: CategoriaFinanceira): Promise<ResultadoRegraEmLote> { return this.request('/api/financeiro/lancamentos/regras/termo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ termo, descricao, categoria }) }); }
  async renomearPendentes(termo: string, descricao: string): Promise<ResultadoRevisaoEmLote> { return this.request('/api/financeiro/lancamentos/revisao/descricao', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ termo, descricao }) }); }
  async categorizarPendentes(termo: string, categoria: CategoriaFinanceira): Promise<ResultadoRevisaoEmLote> { return this.request('/api/financeiro/lancamentos/revisao/categoria', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ termo, categoria }) }); }
  async confirmarPendentes(termo: string, categoria?: CategoriaFinanceira): Promise<ResultadoRevisaoEmLote> { return this.request('/api/financeiro/lancamentos/revisao/confirmacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ termo, categoria: categoria ?? null }) }); }
  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const resposta = await fetch(url, init);
    if (!resposta.ok) { const erro = await resposta.json().catch(() => ({ message: 'Não foi possível concluir a operação.' })); throw new Error(erro.message ?? 'Não foi possível concluir a operação.'); }
    return resposta.json() as Promise<T>;
  }
}
