package br.com.zyven.assistente.application;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import br.com.zyven.assistente.api.SessaoLiveResponse;
import br.com.zyven.assistente.config.AssistenteProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class CriarSessaoLive {

    private static final String TOKEN_URL = "https://generativelanguage.googleapis.com/v1alpha/auth_tokens";

    private final AssistenteProperties properties;
    private final RestClient restClient;

    public CriarSessaoLive(AssistenteProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.create();
    }

    public SessaoLiveResponse executar() {
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
        return new SessaoLiveResponse(
                response.name(), properties.gemini().model(), properties.gemini().voice(),
                properties.assistente().instrucaoSistema());
    }

    private record TokenResponse(String name) {
    }
}
