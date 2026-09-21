# Catálogo de IA do Zyven

Este é o registro operacional dos recursos de IA disponíveis para o produto.
Atualize-o sempre que houver mudança de modelo, limite, credencial, integração
ou decisão de uso. Os limites abaixo são uma fotografia informada em 20/09/2026
e podem mudar conforme o plano do provedor.

## Como manter este arquivo

- Atualize a data desta introdução e a tabela correspondente quando consultar o
  painel do provedor.
- Registre cada nova integração em **Usos de IA no produto**, mesmo quando ela
  ainda estiver em protótipo.
- Não coloque chaves, tokens, prompts com dados pessoais, nem dados reais de
  usuários neste arquivo.
- `0 / limite` significa consumo atual e teto do período exibido pelo painel;
  `0 / 0` significa que não há cota utilizável confirmada naquele painel.
- RPM = requisições por minuto; TPM = tokens por minuto; RPD = requisições por
  dia. Um traço (`—`) indica que a métrica não se aplica ou não foi exibida.

## Escolha rápida

| Necessidade | Preferência | Alternativa |
| --- | --- | --- |
| Conversa e comandos de texto | Gemini 3.5 Flash ou Gemini 3.8 Flash | Gemini 2.5 Flash Lite para menor custo/latência |
| Conversa por voz em tempo real | Gemini 2.5 Flash Native Audio Dialog ou Gemini 3.8 Live | Gemini 3 Flash Live |
| Transcrição | Gemini 3.5 Transcribe / Transcribe Live | — |
| Síntese de fala | Gemini 2.5 Flash TTS ou Gemini 3.1 Flash TTS | — |
| Embeddings e busca semântica | Gemini Embedding 2 | Gemini Embedding 1 |
| Imagens | Nano Banana 2 | Nano Banana 2 Lite |
| Ações em interface visual | Computer Use Preview | Antigravity para fluxos de agentes |
| Pesquisa com fontes | Deep Research Pro Preview | usar grounding quando a resposta exigir fontes |

> A escolha rápida é uma orientação inicial. Antes de implementar, confirme no
> painel se o modelo possui cota ativa e se atende a privacidade, custo e
> latência do caso de uso.

## Modelos e limites atuais

### Agentes

| Modelo | RPM | TPM | RPD | Uso indicado |
| --- | ---: | ---: | ---: | --- |
| Antigravity | 60 | 100K | 100 | Orquestração de tarefas com agentes. |
| Deep Research Pro Preview | 0 | 0 | 0 | Pesquisa aprofundada; sem cota confirmada. |

### Texto

| Modelo | RPM | TPM | RPD | Uso indicado |
| --- | ---: | ---: | ---: | --- |
| Gemini 2 Flash | 0 | 0 | 0 | Texto; sem cota confirmada. |
| Gemini 2 Flash Lite | 0 | 0 | 0 | Texto econômico; sem cota confirmada. |
| Gemini 2.5 Flash | 5 | 250K | 20 | Texto e raciocínio geral. |
| Gemini 2.5 Flash Lite | 10 | 250K | 20 | Texto de baixa latência/custo. |
| Gemini 2.5 Pro | 0 | 0 | 0 | Texto complexo; sem cota confirmada. |
| Gemini 3 Flash | 5 | 250K | 20 | Texto geral. |
| Gemini 3.1 Pro | 0 | 0 | 0 | Texto complexo; sem cota confirmada. |
| Gemini 3.1 Flash Lite | 15 | 250K | 500 | Alto volume de texto simples. |
| Gemini 3.5 Flash | 5 | 250K | 20 | Texto geral. |
| Gemini 3.5 Flash Lite | 15 | 250K | 500 | Alto volume de texto simples. |
| Gemini 3.6 Flash | 5 | 250K | 20 | Texto geral. |
| Gemini 3.7 Flash | 5 | 250K | 20 | Texto geral. |
| Gemini 3.8 Flash | 5 | 250K | 20 | Texto geral. |

### Multimodal, imagem, fala, áudio e vídeo

| Modelo | RPM | TPM | RPD | Uso indicado |
| --- | ---: | ---: | ---: | --- |
| Nano Banana (Gemini 2.5 Flash Preview Image) | 0 | 0 | 0 | Imagem; sem cota confirmada. |
| Gemini 2.5 Flash TTS | 3 | 10K | 10 | Síntese de fala. |
| Gemini 2.5 Pro TTS | 0 | 0 | 0 | Síntese de fala; sem cota confirmada. |
| Nano Banana Pro (Gemini 3 Pro Image) | 0 | 0 | 0 | Imagem; sem cota confirmada. |
| Nano Banana 2 (Gemini 3.1 Flash Image) | 0 | 0 | 0 | Imagem; sem cota confirmada. |
| Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image) | 0 | 0 | 0 | Imagem; sem cota confirmada. |
| Gemini 3.1 Flash TTS | 3 | 10K | 10 | Síntese de fala. |
| Gemini Omni 1.1 Flash | 0 | 0 | 0 | Multimodal; sem cota confirmada. |
| Gemini Omni Flash | 0 | 0 | 0 | Multimodal; sem cota confirmada. |
| Lyria 3 Clip | 0 | 0 | 0 | Áudio/música; sem cota confirmada. |
| Lyria 3 Pro | 0 | 0 | 0 | Áudio/música; sem cota confirmada. |
| Veo 3 Fast Generate | 0 | — | 0 | Vídeo; sem cota confirmada. |
| Veo 3 Generate | 0 | — | 0 | Vídeo; sem cota confirmada. |
| Veo 3 Lite Generate | 0 | — | 0 | Vídeo; sem cota confirmada. |

### API Live

| Modelo | RPM | TPM | RPD | Uso indicado |
| --- | ---: | ---: | ---: | --- |
| Gemini 2.5 Flash Native Audio Dialog | Ilimitado | 1M | Ilimitado | Diálogo de voz nativo em tempo real. |
| Gemini 3 Flash Live | Ilimitado | 65K | Ilimitado | Conversa multimodal em tempo real. |
| Gemini 3.5 Live Translate | Ilimitado | 20K | Ilimitado | Tradução falada em tempo real. |
| Gemini 3.5 Transcribe Live | Ilimitado | 20K | Ilimitado | Transcrição em tempo real. |
| Gemini 3.8 Live | Ilimitado | 65K | Ilimitado | Conversa multimodal em tempo real. |
| Gemini 3.8 Live Extended Thinking | Ilimitado | 65K | Ilimitado | Conversa em tempo real com raciocínio ampliado. |

### Outros

| Modelo | RPM | TPM | RPD | Uso indicado |
| --- | ---: | ---: | ---: | --- |
| Computer Use Preview | 0 | 0 | 0 | Automação de interfaces; sem cota confirmada. |
| Gemini Embedding 1 | 100 | 30K | 1K | Vetorização e busca semântica. |
| Gemini Embedding 2 | 100 | 30K | 1K | Vetorização e busca semântica. |
| Gemini Robotics ER 2 Preview | 5 | 250K | 20 | Robótica/execução; avaliar somente para caso específico. |
| Gemma 4 26B | 30 | 16K | 14.4K | Texto geral com alto volume diário. |
| Gemma 4 31B | 30 | 16K | 14.4K | Texto geral com alto volume diário. |

## Ferramentas de fundamentação (grounding)

| Recurso | Limite diário | Modelos/escopo |
| --- | ---: | --- |
| Fundamentação do mapa | 500 | Deep Research Pro Preview, Gemini 2 Flash, Computer Use Preview, Gemini 2.5 Flash, Gemini 2.5 Flash Lite, Gemini 3.1 Flash Lite, Gemini 3.1 Flash TTS, Gemini 3.5 Flash Lite, Gemini 3.5 Transcribe e Gemini Robotics ER 2 Preview. |
| Fundamentação do mapa | 0 | Gemini 2.5 Pro, Gemini 3 Flash, Gemini 3.1 Pro, Gemini 3.5 Flash, Gemini 3.6 Flash, Gemini 3.7 Flash e Gemini 3.8 Flash. |
| Pesquisar conteúdo de embasamento | 1.5K | Gemini 2, Gemini 2.5 e Default. |
| Pesquisar conteúdo de embasamento | 0 | Gemini 3. |

## Usos de IA no produto

Registre aqui somente usos aprovados, em experimentação ou planejados. Comece
uma nova linha antes de enviar uma integração para produção.

| Status | Recurso do Zyven | Modelo | Objetivo | Dados enviados | Dono | Observações |
| --- | --- | --- | --- | --- | --- | --- |
| Implementado (em desenvolvimento) | Assistente de voz Zyven | Gemini 2.5 Flash Native Audio Preview (`gemini-2.5-flash-native-audio-preview-12-2025`) | Conversa bidirecional por voz em tempo real | Áudio PCM do microfone e instrução de sistema; token efêmero criado pelo backend | Produto/Backend | Sessão Live com transcrição de entrada e saída, retomada de sessão e janela deslizante. Validar custo, privacidade e latência antes de produção. |
| Em experimentação | Extração de demandas pessoais | Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`) | Identificar tarefas mencionadas pelo usuário e classificá-las como sugestões para revisão | Apenas transcrição textual da fala candidata; não envia chave, token, histórico integral ou dados externos | Produto/Backend | Acionado somente por sinais determinísticos de demanda. Cota informada: 15 RPM / 250K TPM / 500 RPD. Confirmar disponibilidade do identificador no provedor antes de produção. |
| Em experimentação | Categorização de OFX | Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`) | Sugerir categoria apenas para lançamentos sem regra local, sempre sujeitos à revisão | Identificador interno temporário e descrição higienizada; não envia arquivo OFX, conta, saldo, identificador bancário ou credencial | Produto/Backend | Acionado após regras locais. Sem envio se não houver chave de API. Validar contrato, retenção pelo provedor, custo e decisão LGPD antes de produção. |

### Modelo de nova entrada

```text
| Em experimentação | Nome do recurso | Nome exato do modelo | Resultado esperado | Dados mínimos necessários, sem segredos | Responsável | Limites, avaliação e decisão pendente |
```
