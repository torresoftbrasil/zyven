package br.com.zyven.autenticacao.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/autenticacao")
public class AutenticacaoController {

    private final AuthenticationManager autenticador;

    public AutenticacaoController(AuthenticationManager autenticador) {
        this.autenticador = autenticador;
    }

    @PostMapping("/login")
    SessaoResponse entrar(@Valid @RequestBody LoginRequest request, HttpServletRequest requisicao) {
        Authentication autenticacao = autenticador.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.login(), request.senha()));
        SecurityContext contexto = SecurityContextHolder.createEmptyContext();
        contexto.setAuthentication(autenticacao);
        SecurityContextHolder.setContext(contexto);
        requisicao.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, contexto);
        return new SessaoResponse(autenticacao.getName());
    }

    @GetMapping("/sessao")
    SessaoResponse sessao(Authentication autenticacao) {
        return new SessaoResponse(autenticacao.getName());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void sair(HttpServletRequest requisicao) {
        HttpSession sessao = requisicao.getSession(false);
        if (sessao != null) sessao.invalidate();
        SecurityContextHolder.clearContext();
    }

    record LoginRequest(@NotBlank @Size(max = 120) String login, @NotBlank @Size(max = 200) String senha) {
    }

    record SessaoResponse(String login) {
    }
}
