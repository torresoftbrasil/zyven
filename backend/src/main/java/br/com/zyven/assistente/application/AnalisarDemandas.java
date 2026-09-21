package br.com.zyven.assistente.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import br.com.zyven.assistente.config.AssistenteProperties;
import br.com.zyven.planejamento.domain.ClassificacaoTarefa;
import br.com.zyven.planejamento.domain.PrioridadeTarefa;
import br.com.zyven.planejamento.infrastructure.PlanejamentoStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class AnalisarDemandas {
    private static final Logger LOGGER = LoggerFactory.getLogger(AnalisarDemandas.class);
    private static final String INSTRUCAO = "Extraia apenas demandas pessoais explícitas ou inequivocamente implícitas. Retorne JSON puro: {\\\"demandas\\\":[{\\\"titulo\\\":string,\\\"descricao\\\":string,\\\"titulogrupo\\\":string|null,\\\"classificacao\\\":DOCUMENTACAO|RESERVA|FINANCEIRO|LOGISTICA|SAUDE|ROTEIRO|OUTRO,\\\"prioridade\\\":BAIXA|MEDIA|ALTA|CRITICA,\\\"dataplanejada\\\":YYYY-MM-DD|null,\\\"datalimite\\\":YYYY-MM-DD|null,\\\"confianca\\\":0..1}]}. Se não houver demanda, use lista vazia. Nunca invente datas.";
    private final AssistenteProperties properties;
    private final PlanejamentoStore planejamento;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.create();
    public AnalisarDemandas(AssistenteProperties properties, PlanejamentoStore planejamento) { this.properties = properties; this.planejamento = planejamento; }
    public void executar(UUID interacaoId, String conteudo) {
        if (properties.gemini().apikey() == null || properties.gemini().apikey().isBlank()) return;
        if (!podeConterDemanda(conteudo)) return;
        try {
            Map<String, Object> body = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", INSTRUCAO + "\nFala do usuário: " + conteudo)))), "generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.1));
            String resposta = restClient.post().uri("https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent", properties.gemini().modelotexto())
                    .header("x-goog-api-key", properties.gemini().apikey()).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(String.class);
            JsonNode demandas = objectMapper.readTree(resposta).path("candidates").path(0).path("content").path("parts").path(0).path("text");
            for (JsonNode item : objectMapper.readTree(demandas.asText()).path("demandas")) salvar(interacaoId, item);
        } catch (Exception exception) { LOGGER.warn("Não foi possível analisar demandas da interação {}", interacaoId); }
    }
    private boolean podeConterDemanda(String conteudo) {
        String normalizado = conteudo.toLowerCase();
        return normalizado.contains("preciso") || normalizado.contains("tenho que") || normalizado.contains("lembr")
                || normalizado.contains("taref") || normalizado.contains("comprar") || normalizado.contains("agend")
                || normalizado.contains("resolver") || normalizado.contains("até ") || normalizado.contains("prazo");
    }
    private void salvar(UUID interacaoId, JsonNode item) {
        planejamento.sugerirDemanda(interacaoId, texto(item, "titulogrupo"), texto(item, "titulo"), texto(item, "descricao"),
                ClassificacaoTarefa.valueOf(item.path("classificacao").asText("OUTRO")), PrioridadeTarefa.valueOf(item.path("prioridade").asText("MEDIA")),
                data(item, "dataplanejada"), data(item, "datalimite"), item.path("confianca").decimalValue());
    }
    private String texto(JsonNode item, String campo) { return item.path(campo).isNull() ? null : item.path(campo).asText(null); }
    private LocalDate data(JsonNode item, String campo) { String valor = texto(item, campo); return valor == null || valor.isBlank() ? null : LocalDate.parse(valor); }
}
