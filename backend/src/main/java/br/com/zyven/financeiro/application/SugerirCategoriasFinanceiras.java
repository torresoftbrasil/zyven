package br.com.zyven.financeiro.application;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Set;
import java.util.stream.Collectors;

import br.com.zyven.assistente.config.AssistenteProperties;
import br.com.zyven.financeiro.domain.CategoriaFinanceira;
import br.com.zyven.financeiro.infrastructure.FinanceiroStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class SugerirCategoriasFinanceiras {
    private static final Logger LOGGER = LoggerFactory.getLogger(SugerirCategoriasFinanceiras.class);
    private static final String INSTRUCAO = "Classifique descrições higienizadas de transações brasileiras. Retorne JSON puro {\"sugestoes\":[{\"id\":string,\"categoria\":ALIMENTACAO|MORADIA|TRANSPORTE|SAUDE|LAZER|ASSINATURAS|EDUCACAO|COMPRAS|TARIFAS|TRANSFERENCIAS|RECEITAS|OUTROS,\"confianca\":0..1}]}. Não infira pessoa, conta, localização ou dados além da categoria. Para incerteza, use OUTROS e confiança baixa.";
    private final AssistenteProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient;

    public SugerirCategoriasFinanceiras(AssistenteProperties properties) {
        this.properties = properties; restClient = RestClient.create();
    }

    public List<FinanceiroStore.SugestaoCategoria> executar(List<FinanceiroStore.PendenteParaAnalise> pendentes) {
        if (pendentes.isEmpty() || properties.gemini().apikey() == null || properties.gemini().apikey().isBlank()) return List.of();
        try {
            List<Map<String, String>> dadosMinimos = pendentes.stream().map(item -> Map.of("id", item.lancamentoid().toString(), "descricao", higienizarParaIa(item.descricao()))).toList();
            Map<String, Object> body = Map.of("systemInstruction", Map.of("parts", List.of(Map.of("text", INSTRUCAO))), "contents", List.of(Map.of("parts", List.of(Map.of("text", objectMapper.writeValueAsString(dadosMinimos))))), "generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.0));
            String resposta = restClient.post().uri("https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent", properties.gemini().modelotexto())
                    .header("x-goog-api-key", properties.gemini().apikey()).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(String.class);
            JsonNode sugestoes = objectMapper.readTree(objectMapper.readTree(resposta).path("candidates").path(0).path("content").path("parts").path(0).path("text").asText()).path("sugestoes");
            List<FinanceiroStore.SugestaoCategoria> resultado = new ArrayList<>();
            Set<UUID> permitidos = pendentes.stream().map(FinanceiroStore.PendenteParaAnalise::lancamentoid).collect(Collectors.toSet());
            for (JsonNode item : sugestoes) {
                UUID id = UUID.fromString(item.path("id").asText());
                BigDecimal confianca = item.path("confianca").decimalValue();
                if (!permitidos.remove(id) || confianca.compareTo(BigDecimal.ZERO) < 0 || confianca.compareTo(BigDecimal.ONE) > 0) continue;
                resultado.add(new FinanceiroStore.SugestaoCategoria(id, CategoriaFinanceira.valueOf(item.path("categoria").asText("OUTROS")), confianca));
            }
            return resultado;
        } catch (Exception exception) {
            LOGGER.warn("Não foi possível gerar sugestões de categoria financeira");
            return List.of();
        }
    }

    private String higienizarParaIa(String descricao) {
        return descricao.replaceAll("[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}", "[email]")
                .replaceAll("(?<!\\d)\\d{3}\\.?\\d{3}\\.?\\d{3}[- ]?\\d{2}(?!\\d)", "[documento]")
                .replaceAll("(?<!\\d)\\d{2}\\.?\\d{3}\\.?\\d{3}[/ ]?\\d{4}[- ]?\\d{2}(?!\\d)", "[documento]")
                .replaceAll("(?<!\\d)\\d{5,}(?!\\d)", "[numero]");
    }
}
