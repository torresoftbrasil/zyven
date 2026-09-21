package br.com.zyven.assistente.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "zyven")
public record AssistenteProperties(Gemini gemini, Assistente assistente) {

    public record Gemini(String apikey, String model, String voice) {
    }

    public record Assistente(String nomeusuario, String personalidade) {
        public String instrucaoSistema() {
            return personalidade + " O nome pelo qual você deve chamar o usuário é " + nomeusuario + ".";
        }
    }
}
