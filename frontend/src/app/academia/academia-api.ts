import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface SerieConcluida { numero: number; carga: number | null; dataconclusao: string; }
export interface Exercicio { id: string | null; nome: string; series: string; repeticoes: string; observacao: string; pausasegundos: number; carga: number | null; seriesconcluidas: number; videourl: string | null; seriesregistradas: SerieConcluida[]; }
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
  previaTexto(texto: string): Promise<Treino[]> { return this.http.post<Treino[]>('/api/academia/treinos/texto/previa', { texto }).toPromise().then(it => it ?? []); }
  confirmarTexto(treinos: Treino[]): Promise<Treino[]> { return this.http.post<Treino[]>('/api/academia/treinos/texto/confirmar', treinos).toPromise().then(it => it ?? []); }
  concluirSerie(treinoId: string, exercicioId: string, carga: number | null): Promise<Treino> { return this.http.post<Treino>(`/api/academia/treinos/${treinoId}/exercicios/${exercicioId}/series`, { carga }).toPromise().then(it => { if (!it) throw new Error('Treino indisponível.'); return it; }); }
  buscarVideo(nome: string): Promise<string> { return this.http.post<{url: string}>('/api/academia/videos/busca', { nome }).toPromise().then(it => { if (!it?.url) throw new Error('Vídeo indisponível.'); return it.url; }); }
  salvarVideo(treinoId: string, exercicioId: string, url: string): Promise<Treino> { return this.http.patch<Treino>(`/api/academia/treinos/${treinoId}/exercicios/${exercicioId}/video`, { url }).toPromise().then(it => { if (!it) throw new Error('Treino indisponível.'); return it; }); }
  mover(id: string, data: string): Promise<Treino> { return this.http.patch<Treino>(`/api/academia/treinos/${id}/data`, { data }).toPromise().then(it => { if (!it) throw new Error('Treino indisponível.'); return it; }); }
}
