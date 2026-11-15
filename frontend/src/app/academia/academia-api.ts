import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface Exercicio { nome: string; series: string; repeticoes: string; observacao: string; }
export interface Treino { id: string | null; data: string; titulo: string; exercicios: Exercicio[]; }

@Injectable({ providedIn: 'root' })
export class AcademiaApi {
  constructor(private readonly http: HttpClient) {}
  listar(): Promise<Treino[]> { return this.http.get<Treino[]>('/api/academia/treinos').toPromise().then(it => it ?? []); }
  previa(fotos: File[]): Promise<Treino[]> {
    const dados = new FormData();
    fotos.forEach(foto => dados.append('fotos', foto));
    return this.http.post<Treino[]>('/api/academia/treinos/fotos/previa', dados).toPromise().then(it => it ?? []);
  }
  confirmar(treinos: Treino[]): Promise<Treino[]> { return this.http.post<Treino[]>('/api/academia/treinos/fotos/confirmar', treinos).toPromise().then(it => it ?? []); }
  mover(id: string, data: string): Promise<Treino> { return this.http.patch<Treino>(`/api/academia/treinos/${id}/data`, { data }).toPromise().then(it => { if (!it) throw new Error('Treino indisponível.'); return it; }); }
}
