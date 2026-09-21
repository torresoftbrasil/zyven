import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface SessaoAutenticada {
  login: string;
}

@Injectable({ providedIn: 'root' })
export class AutenticacaoApi {
  constructor(private readonly http: HttpClient) {}

  entrar(login: string, senha: string): Promise<SessaoAutenticada> {
    return this.http.post<SessaoAutenticada>('/api/autenticacao/login', { login, senha }).toPromise()
      .then((sessao) => {
        if (!sessao) throw new Error('Não foi possível iniciar a sessão.');
        return sessao;
      });
  }

  sessao(): Promise<SessaoAutenticada> {
    return this.http.get<SessaoAutenticada>('/api/autenticacao/sessao').toPromise()
      .then((sessao) => {
        if (!sessao) throw new Error('Sessão indisponível.');
        return sessao;
      });
  }

  sair(): Promise<void> {
    return this.http.post<void>('/api/autenticacao/logout', {}).toPromise().then(() => undefined);
  }
}
