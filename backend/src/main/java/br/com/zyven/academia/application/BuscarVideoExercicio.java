package br.com.zyven.academia.application;

import br.com.zyven.assistente.config.AssistenteProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class BuscarVideoExercicio {
    private static final Pattern VIDEO = Pattern.compile("(?:youtube\\.com/watch\\?v=|youtu\\.be/|youtube\\.com/shorts/)([A-Za-z0-9_-]{11})");
    private final AssistenteProperties properties;
    private final RestClient client = RestClient.create();
    private final ObjectMapper json = new ObjectMapper();

    public BuscarVideoExercicio(AssistenteProperties properties) { this.properties = properties; }

    public String executar(String nome) throws Exception {
        if (nome == null || nome.isBlank() || nome.length() > 160) throw new IllegalArgumentException("Exercício inválido.");
        if (properties.gemini().apikey() == null || properties.gemini().apikey().isBlank()) throw new IllegalStateException("Busca de vídeo indisponível.");
        String pedido = "Pesquise na internet um vídeo público do YouTube que demonstre a execução do exercício de musculação chamado '" + nome.replace("'", "")
                + "'. Responda apenas a URL original no formato https://www.youtube.com/watch?v=ID. Se não encontrar um vídeo adequado, responda NENHUM. Não invente URL.";
        Map<String, Object> corpo = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", pedido)))),
                "tools", List.of(Map.of("google_search", Map.of())));
        String resposta;
        try {
            resposta = client.post().uri("https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent", "gemini-3.1-flash-lite")
                    .header("x-goog-api-key", properties.gemini().apikey()).contentType(MediaType.APPLICATION_JSON).body(corpo).retrieve().body(String.class);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 429) throw new IllegalArgumentException("A busca de vídeos atingiu a cota do Gemini. Tente novamente mais tarde.");
            throw exception;
        }
        JsonNode candidato = json.readTree(resposta).path("candidates").path(0);
        String texto = candidato.path("content").path("parts").path(0).path("text").asText("");
        Matcher encontrado = VIDEO.matcher(texto);
        if (!encontrado.find()) throw new IllegalArgumentException("Não encontrei um vídeo verificável para este exercício.");
        return "https://www.youtube.com/watch?v=" + encontrado.group(1);
    }
}
