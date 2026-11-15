package br.com.zyven.notificacao.api;

import br.com.zyven.notificacao.domain.SugestaoNotificacao;
import br.com.zyven.notificacao.infrastructure.NotificacaoStore;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {
    private final NotificacaoStore store;
    public NotificacaoController(NotificacaoStore store) { this.store = store; }
    @GetMapping List<SugestaoNotificacao> listar() { return store.listar(); }
    @PostMapping("/avaliar") List<SugestaoNotificacao> avaliar() { return store.avaliar(); }
    @GetMapping("/preferencias") NotificacaoStore.Preferencias preferencias() { return store.preferencias(); }
    @PatchMapping("/preferencias/meta") NotificacaoStore.Preferencias meta(@RequestBody MetaRequest request) { return store.definirMeta(request.metadiaria()); }
    @PostMapping("/agua") NotificacaoStore.Preferencias agua(@RequestBody AguaRequest request) { return store.beberAgua(request.quantidade()); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void descartar(@PathVariable UUID id) { store.descartar(id); }
    record MetaRequest(BigDecimal metadiaria) { }
    record AguaRequest(int quantidade) { }
}
