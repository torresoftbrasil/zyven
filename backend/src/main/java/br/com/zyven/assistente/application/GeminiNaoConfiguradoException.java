package br.com.zyven.assistente.application;

public class GeminiNaoConfiguradoException extends RuntimeException {
    public GeminiNaoConfiguradoException() {
        super("A voz precisa da chave Gemini configurada neste ambiente.");
    }
}
