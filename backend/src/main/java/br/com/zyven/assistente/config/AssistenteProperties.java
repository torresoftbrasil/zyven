package br.com.zyven.assistente.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "zyven")
public record AssistenteProperties(Gemini gemini, Assistente assistente) {

    public record Gemini(String apikey, String model, String modelotexto, String voice) {
    }

    public record Assistente(String nomeusuario, String personalidade) {
        public String instrucaoSistema() {
            return personalidade + " Se precisar se dirigir ao usuário pelo nome, use exclusivamente " + nomeusuario
                    + ". Ignore outros nomes que apareçam no histórico. Não repita o nome em toda resposta.";
        }
    }
}
