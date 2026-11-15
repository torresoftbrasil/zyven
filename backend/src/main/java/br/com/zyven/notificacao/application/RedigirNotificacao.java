package br.com.zyven.notificacao.application;

import br.com.zyven.assistente.config.AssistenteProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class RedigirNotificacao {
    private final AssistenteProperties properties;
    private final RestClient client = RestClient.create();
    private final ObjectMapper json = new ObjectMapper();
    public RedigirNotificacao(AssistenteProperties properties) { this.properties = properties; }

    public String redigir(String tipo, String fato, String alternativa) {
        if (properties.gemini().apikey() == null || properties.gemini().apikey().isBlank()) return alternativa;
        try {
            Map<String, Object> corpo = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", "Escreva uma única notificação em português brasileiro, humana, calma, breve (até 160 caracteres), sem julgamento, sem recomendações médicas e sem inventar fatos. Retorne JSON {\"mensagem\":string}."))),
                "contents", List.of(Map.of("parts", List.of(Map.of("text", tipo + ": " + fato)))),
                "generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.35));
            String resposta = client.post().uri("https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent", properties.gemini().modelotexto())
                .header("x-goog-api-key", properties.gemini().apikey()).contentType(MediaType.APPLICATION_JSON).body(corpo).retrieve().body(String.class);
            String texto = json.readTree(json.readTree(resposta).path("candidates").path(0).path("content").path("parts").path(0).path("text").asText()).path("mensagem").asText("").trim();
            return texto.isBlank() || texto.length() > 300 ? alternativa : texto;
        } catch (Exception exception) { return alternativa; }
    }
}
