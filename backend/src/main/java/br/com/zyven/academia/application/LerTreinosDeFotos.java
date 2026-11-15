package br.com.zyven.academia.application;

import br.com.zyven.academia.domain.Treino;
import br.com.zyven.assistente.config.AssistenteProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LerTreinosDeFotos {
    private final AssistenteProperties properties;
    private final RestClient client = RestClient.create();
    private final ObjectMapper json = new ObjectMapper();
    public LerTreinosDeFotos(AssistenteProperties properties) { this.properties = properties; }

    public List<Treino> executar(List<MultipartFile> fotos) throws Exception {
        if (fotos == null || fotos.isEmpty() || fotos.size() > 7) throw new IllegalArgumentException("Envie de 1 a 7 fotos de treino.");
        if (properties.gemini().apikey() == null || properties.gemini().apikey().isBlank()) throw new IllegalStateException("A leitura de fotos precisa da chave Gemini no servidor.");
        List<Map<String, Object>> partes = new ArrayList<>();
        partes.add(Map.of("text", "Extraia somente treinos claramente legíveis. JSON puro: {\"treinos\":[{\"dia\":1..7,\"titulo\":string,\"exercicios\":[{\"nome\":string,\"series\":string,\"repeticoes\":string,\"observacao\":string}]}]}. dia 1=segunda e 7=domingo. Não invente exercícios; na dúvida omita. Máximo 14 treinos e 40 exercícios por treino."));
        for (MultipartFile foto : fotos) {
            String tipo = foto.getContentType();
            if (!List.of("image/jpeg", "image/png", "image/webp").contains(tipo) || foto.getSize() == 0 || foto.getSize() > 5_000_000) throw new IllegalArgumentException("Use fotos JPEG, PNG ou WebP com até 5 MB cada.");
            partes.add(Map.of("inline_data", Map.of("mime_type", tipo, "data", Base64.getEncoder().encodeToString(foto.getBytes()))));
        }
        Map<String, Object> corpo = Map.of("contents", List.of(Map.of("parts", partes)), "generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.0));
        String resposta = client.post().uri("https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent", properties.gemini().modelotexto())
                .header("x-goog-api-key", properties.gemini().apikey()).contentType(MediaType.APPLICATION_JSON).body(corpo).retrieve().body(String.class);
        JsonNode extraido = json.readTree(json.readTree(resposta).path("candidates").path(0).path("content").path("parts").path(0).path("text").asText()).path("treinos");
        LocalDate segunda = LocalDate.now(ZoneId.of("America/Sao_Paulo")).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<Treino> treinos = new ArrayList<>();
        for (JsonNode item : extraido) {
            int dia = item.path("dia").asInt(0);
            if (dia < 1 || dia > 7 || treinos.size() >= 14) continue;
            List<Treino.Exercicio> exercicios = new ArrayList<>();
            for (JsonNode exercicio : item.path("exercicios")) {
                if (exercicios.size() >= 40) break;
                String nome = limitar(exercicio.path("nome").asText(""), 160);
                if (!nome.isBlank()) exercicios.add(new Treino.Exercicio(nome, limitar(exercicio.path("series").asText(""), 80), limitar(exercicio.path("repeticoes").asText(""), 80), limitar(exercicio.path("observacao").asText(""), 300)));
            }
            String titulo = limitar(item.path("titulo").asText("Treino do dia"), 160);
            if (!exercicios.isEmpty()) treinos.add(new Treino(null, segunda.plusDays(dia - 1), titulo.isBlank() ? "Treino do dia" : titulo, exercicios));
        }
        if (treinos.isEmpty()) throw new IllegalArgumentException("Não foi possível ler treinos nessas fotos. Confira a nitidez e tente novamente.");
        return treinos;
    }

    private String limitar(String texto, int maximo) {
        String limpo = texto.trim();
        return limpo.substring(0, Math.min(limpo.length(), maximo));
    }
}
