package br.com.zyven.assistente.application;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import br.com.zyven.assistente.api.SessaoLiveResponse;
import br.com.zyven.assistente.config.AssistenteProperties;
import br.com.zyven.conversa.application.GerenciarConversa;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class CriarSessaoLive {

    private static final String TOKEN_URL = "https://generativelanguage.googleapis.com/v1alpha/auth_tokens";

    private final AssistenteProperties properties;
    private final RestClient restClient;
    private final GerenciarConversa conversas;

    public CriarSessaoLive(AssistenteProperties properties, GerenciarConversa conversas) {
        this.properties = properties;
        this.conversas = conversas;
        this.restClient = RestClient.create();
    }

    public SessaoLiveResponse executar(java.util.UUID conversaId) {
        String apiKey = properties.gemini().apikey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY não está configurada no processo do backend");
        }

        Instant now = Instant.now();
        Map<String, Object> authToken = Map.of(
                "uses", 1,
                "expireTime", now.plus(30, ChronoUnit.MINUTES).toString(),
                "newSessionExpireTime", now.plus(1, ChronoUnit.MINUTES).toString());

        TokenResponse response;
        try {
            response = restClient.post()
                    .uri(TOKEN_URL)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(authToken)
                    .retrieve()
                    .body(TokenResponse.class);
        } catch (RestClientResponseException exception) {
            throw new IllegalStateException(
                    "Gemini recusou a criação da sessão: HTTP " + exception.getStatusCode()
                            + " - " + exception.getResponseBodyAsString(), exception);
        }

        if (response == null || response.name() == null || response.name().isBlank()) {
            throw new IllegalStateException("Gemini não retornou um token efêmero");
        }
        java.util.UUID conversa = conversaId == null ? conversas.iniciar("Conversa por voz") : conversaId;
        GerenciarConversa.Contexto contexto = conversas.montarContexto(conversa);
        return new SessaoLiveResponse(
                response.name(), properties.gemini().model(), properties.gemini().voice(),
                instrucaoComContexto(contexto), conversa);
    }

    private String instrucaoComContexto(GerenciarConversa.Contexto contexto) {
        String historico = contexto.interacoesrecentes().stream().map(item -> item.papel() + ": " + item.conteudo()).collect(java.util.stream.Collectors.joining("\n"));
        String tarefas = contexto.tarefaspendentes().stream().map(item -> item.titulo() + " | " + item.status() + " | prazo: " + item.datalimite()).collect(java.util.stream.Collectors.joining("\n"));
        String sugestoes = contexto.demandassugeridas().stream().map(item -> item.titulo() + " | sugestão pendente").collect(java.util.stream.Collectors.joining("\n"));
        return properties.assistente().instrucaoSistema() + "\n\n" + contexto.regraoperacional()
                + "\n\nCONTEXTO CANÔNICO DO ZYVEN (use apenas estes fatos):\nHistórico recente:\n" + historico
                + "\nTarefas pendentes:\n" + tarefas + "\nSugestões aguardando revisão:\n" + sugestoes;
    }

    private record TokenResponse(String name) {
    }
}
