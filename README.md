# Zyven

Assistente pessoal com frontend Angular, API Spring Boot e PostgreSQL.

## Estrutura

- `frontend/`: Angular 22
- `backend/`: Java 25 e Spring Boot 4
- `prototype/`: referência visual aprovada

## Banco local

PostgreSQL em `localhost:5432`, banco `zyven`, usuário `zyven`, senha `zyven`.

## Execução

Backend:

```bash
cd backend
export GEMINI_API_KEY="sua-chave"
mvn spring-boot:run
```

Frontend:

```bash
cd frontend
npm start
```

Migrações pelo IntelliJ: execute `br.com.zyven.MigrationApplication`.

## Fluxos disponíveis

- OFX: solte ou escolha o arquivo, peça a prévia a Zyven, confirme a importação e
  revise as categorias em Financeiro > Importações. Regras por termo e nomes
  corrigidos são lembrados para extratos futuros.
- Academia: adicione até sete fotos de treinos pelo botão `+`, peça a leitura,
  confira os exercícios e confirme antes de gravar. Datas podem ser alteradas na
  tela ou por comando de voz com o módulo Academia aberto.
- Avisos: configure a meta diária de despesas e registre água em Avisos. Treinos,
  gastos acima da meta e pausas para água geram sugestões deduplicadas. O envio
  ao dispositivo exige permissão e ocorre enquanto o app está aberto; push remoto
  ainda precisa de infraestrutura de assinatura e entrega.

## Instalação no celular

O build de produção inclui manifesto e service worker. No Safari do iPhone,
abra o endereço HTTPS do Zyven e escolha **Compartilhar > Adicionar à Tela de
Início**. Depois do primeiro login com usuário e senha, o app instalado oferece
o cadastro de uma chave de acesso: toque em **Criar chave neste iPhone** e
confirme o salvamento no app Senhas. Na próxima abertura do app instalado, o
Zyven pede Face ID antes de mostrar o painel, mesmo com uma sessão do servidor
válida. Se o Safari exigir um toque, use **Entrar com Face ID** na tela de
acesso; usuário e senha continuam disponíveis. A sessão do servidor permanece
ativa por até 30 dias sem uso e sobrevive a reinícios. Face ID ou outro método
de verificação
fica sob controle do sistema operacional. Configure `ZYVEN_WEBAUTHN_RPID` e
`ZYVEN_WEBAUTHN_ORIGIN` no servidor para o domínio HTTPS utilizado. A variável
`ZYVEN_USUARIO_SENHAHASH` recebe somente o hash BCrypt da senha inicial; nunca
grave a senha em texto claro no repositório.
