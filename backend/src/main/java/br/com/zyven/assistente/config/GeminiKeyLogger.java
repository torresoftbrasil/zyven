package br.com.zyven.assistente.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class GeminiKeyLogger implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(GeminiKeyLogger.class);

    private final AssistenteProperties properties;

    public GeminiKeyLogger(AssistenteProperties properties) {
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        String apiKey = properties.gemini().apikey();
        if (apiKey == null || apiKey.isBlank()) {
            LOGGER.warn("Gemini API key: não configurada");
            return;
        }

        LOGGER.info("Gemini API key carregada");
    }
}
