package br.com.zyven.autenticacao.infrastructure;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.web.webauthn.api.PublicKeyCredentialCreationOptions;
import org.springframework.security.web.webauthn.registration.PublicKeyCredentialCreationOptionsRepository;

/** O desafio é temporário e não precisa sobreviver a um reinício do servidor. */
public class OpcoesCadastroChaveRepository implements PublicKeyCredentialCreationOptionsRepository {

    private static final Duration VALIDADE = Duration.ofMinutes(5);
    private final Map<String, Opcoes> pendentes = new ConcurrentHashMap<>();

    @Override
    public void save(HttpServletRequest request, HttpServletResponse response, PublicKeyCredentialCreationOptions options) {
        String sessaoId = request.getSession(true).getId();
        Instant agora = Instant.now();
        pendentes.entrySet().removeIf(entry -> entry.getValue().expiracao().isBefore(agora));
        pendentes.put(sessaoId, new Opcoes(options, agora.plus(VALIDADE)));
    }

    @Override
    public PublicKeyCredentialCreationOptions load(HttpServletRequest request) {
        HttpSession sessao = request.getSession(false);
        if (sessao == null) return null;
        Opcoes opcoes = pendentes.remove(sessao.getId());
        return opcoes != null && Instant.now().isBefore(opcoes.expiracao()) ? opcoes.valor() : null;
    }

    private record Opcoes(PublicKeyCredentialCreationOptions valor, Instant expiracao) { }
}
