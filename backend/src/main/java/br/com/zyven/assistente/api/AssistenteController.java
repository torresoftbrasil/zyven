package br.com.zyven.assistente.api;

import br.com.zyven.assistente.application.CriarSessaoLive;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assistente")
public class AssistenteController {

    private final CriarSessaoLive criarSessaoLive;

    public AssistenteController(CriarSessaoLive criarSessaoLive) {
        this.criarSessaoLive = criarSessaoLive;
    }

    @PostMapping("/sessao")
    SessaoLiveResponse criarSessao() {
        return criarSessaoLive.executar();
    }
}
