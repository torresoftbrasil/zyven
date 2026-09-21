package br.com.zyven.assistente.api;

public record SessaoLiveResponse(String token, String model, String voice, String systemInstruction, java.util.UUID conversaid) {
}
