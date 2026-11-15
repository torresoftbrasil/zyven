import { Injectable } from '@angular/core';

interface CriacaoOpcoes { challenge: string; rp: PublicKeyCredentialRpEntity; user: Omit<PublicKeyCredentialUserEntity, 'id'> & { id: string }; pubKeyCredParams: PublicKeyCredentialParameters[]; timeout?: number; attestation?: AttestationConveyancePreference; authenticatorSelection?: AuthenticatorSelectionCriteria; excludeCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>; }
interface AutenticacaoOpcoes { challenge: string; rpId?: string; timeout?: number; allowCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>; userVerification?: UserVerificationRequirement; }

@Injectable({ providedIn: 'root' })
export class PasskeyApi {
  private readonly chaveDispositivo = 'zyven.passkey.dispositivo';
  readonly disponivel = typeof window !== 'undefined' && window.isSecureContext && 'PublicKeyCredential' in window;
  readonly instalado = typeof window !== 'undefined' && ((typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || (navigator as Navigator & { standalone?: boolean }).standalone === true);

  temChaveNesteDispositivo(): boolean {
    return this.disponivel && localStorage.getItem(this.chaveDispositivo) !== null;
  }

  async registrar(): Promise<void> {
    const resposta = await fetch('/webauthn/register/options', { method: 'POST', credentials: 'same-origin' });
    if (!resposta.ok) throw new Error('Não foi possível preparar o Face ID.');
    const opcoes = await resposta.json() as CriacaoOpcoes;
    const credencial = await navigator.credentials.create({ publicKey: {
      ...opcoes,
      challenge: this.decodificar(opcoes.challenge),
      user: { ...opcoes.user, id: this.decodificar(opcoes.user.id) },
      excludeCredentials: opcoes.excludeCredentials?.map(item => ({ ...item, id: this.decodificar(item.id) })),
      authenticatorSelection: { ...opcoes.authenticatorSelection, authenticatorAttachment: 'platform', userVerification: 'required' },
    } }) as PublicKeyCredential | null;
    if (!credencial) throw new Error('Cadastro do Face ID cancelado.');
    const dados = credencial.response as AuthenticatorAttestationResponse;
    const registro = await fetch('/webauthn/register', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicKey: { credential: {
      id: credencial.id, rawId: this.codificar(credencial.rawId), type: credencial.type,
      response: { attestationObject: this.codificar(dados.attestationObject), clientDataJSON: this.codificar(dados.clientDataJSON), transports: dados.getTransports?.() ?? [] },
      clientExtensionResults: credencial.getClientExtensionResults(), authenticatorAttachment: 'platform',
    }, label: 'Zyven neste dispositivo' } }) });
    if (!registro.ok) throw new Error('Não foi possível salvar a credencial neste dispositivo.');
    localStorage.setItem(this.chaveDispositivo, credencial.id);
  }

  async entrar(somenteNesteDispositivo = false): Promise<void> {
    const resposta = await fetch('/webauthn/authenticate/options', { method: 'POST', credentials: 'same-origin' });
    if (!resposta.ok) throw new Error('Não foi possível preparar a autenticação facial.');
    const opcoes = await resposta.json() as AutenticacaoOpcoes;
    const idLocal = somenteNesteDispositivo ? localStorage.getItem(this.chaveDispositivo) : null;
    const credencial = await navigator.credentials.get({ publicKey: {
      ...opcoes, challenge: this.decodificar(opcoes.challenge),
      allowCredentials: idLocal
        ? [{ type: 'public-key', id: this.decodificar(idLocal), transports: ['internal'] }]
        : opcoes.allowCredentials?.map(item => ({ ...item, id: this.decodificar(item.id) })),
      userVerification: 'required',
    } }) as PublicKeyCredential | null;
    if (!credencial) throw new Error('Autenticação cancelada.');
    const dados = credencial.response as AuthenticatorAssertionResponse;
    const autenticacao = await fetch('/login/webauthn', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      id: credencial.id, rawId: this.codificar(credencial.rawId), type: credencial.type,
      response: { authenticatorData: this.codificar(dados.authenticatorData), clientDataJSON: this.codificar(dados.clientDataJSON), signature: this.codificar(dados.signature), userHandle: dados.userHandle ? this.codificar(dados.userHandle) : null },
      clientExtensionResults: credencial.getClientExtensionResults(), authenticatorAttachment: 'platform',
    }) });
    if (!autenticacao.ok) throw new Error('Face ID não reconhecido. Entre com usuário e senha.');
  }

  private decodificar(valor: string): ArrayBuffer {
    const base64 = valor.replace(/-/g, '+').replace(/_/g, '/');
    const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    return Uint8Array.from(binario, letra => letra.charCodeAt(0)).buffer;
  }
  private codificar(dados: ArrayBuffer): string {
    const bytes = new Uint8Array(dados);
    let binario = '';
    for (const byte of bytes) binario += String.fromCharCode(byte);
    return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
