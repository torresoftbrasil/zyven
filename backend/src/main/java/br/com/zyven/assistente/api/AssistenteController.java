package br.com.zyven.assistente.api;

import br.com.zyven.assistente.application.CriarSessaoLive;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/assistente")
public class AssistenteController {

    private final CriarSessaoLive criarSessaoLive;

    public AssistenteController(CriarSessaoLive criarSessaoLive) {
        this.criarSessaoLive = criarSessaoLive;
    }

    @PostMapping("/sessao")
    SessaoLiveResponse criarSessao(@RequestBody(required = false) SessaoLiveRequest request) {
        return criarSessaoLive.executar(request == null ? null : request.conversaid());
    }

    record SessaoLiveRequest(java.util.UUID conversaid) { }
}
