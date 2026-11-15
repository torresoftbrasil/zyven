import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface Notificacao { id: string; tipo: 'ORCAMENTO' | 'TREINO' | 'AGUA'; titulo: string; mensagem: string; estado: 'PENDENTE' | 'CONCLUIDA' | 'DESCARTADA'; }
export interface PreferenciasNotificacao { metadiaria: number | null; aguaalvodiaria: number; aguahoje: number; }
@Injectable({ providedIn: 'root' })
export class NotificacaoApi {
  constructor(private readonly http: HttpClient) {}
  avaliar(): Promise<Notificacao[]> { return this.http.post<Notificacao[]>('/api/notificacoes/avaliar', {}).toPromise().then(it => it ?? []); }
  preferencias(): Promise<PreferenciasNotificacao> { return this.http.get<PreferenciasNotificacao>('/api/notificacoes/preferencias').toPromise().then(it => { if (!it) throw new Error('Preferências indisponíveis.'); return it; }); }
  meta(valor: number | null): Promise<PreferenciasNotificacao> { return this.http.patch<PreferenciasNotificacao>('/api/notificacoes/preferencias/meta', { metadiaria: valor }).toPromise().then(it => { if (!it) throw new Error('Não foi possível salvar a meta.'); return it; }); }
  agua(quantidade: number): Promise<PreferenciasNotificacao> { return this.http.post<PreferenciasNotificacao>('/api/notificacoes/agua', { quantidade }).toPromise().then(it => { if (!it) throw new Error('Não foi possível registrar a água.'); return it; }); }
  descartar(id: string): Promise<void> { return this.http.delete<void>(`/api/notificacoes/${id}`).toPromise().then(() => undefined); }
}
