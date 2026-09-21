package br.com.zyven.conversa.api;

import java.util.UUID;

import br.com.zyven.conversa.application.GerenciarConversa;
import br.com.zyven.conversa.domain.OrigemInteracao;
import br.com.zyven.conversa.domain.PapelInteracao;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversas")
public class ConversaController {
    private final GerenciarConversa gerenciar;
    public ConversaController(GerenciarConversa gerenciar) { this.gerenciar = gerenciar; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) ConversaResponse iniciar(@Valid @RequestBody(required = false) IniciarConversaRequest request) {
        UUID id = gerenciar.iniciar(request == null ? null : request.titulo()); return new ConversaResponse(id);
    }
    @PostMapping("/{conversaid}/interacoes") @ResponseStatus(HttpStatus.ACCEPTED) void registrar(@PathVariable UUID conversaid, @Valid @RequestBody RegistrarInteracaoRequest request) {
        gerenciar.registrar(conversaid, request.papel(), request.origem(), request.conteudo());
    }
    @GetMapping("/{conversaid}/contexto") GerenciarConversa.Contexto contexto(@PathVariable UUID conversaid) { return gerenciar.montarContexto(conversaid); }
    public record IniciarConversaRequest(String titulo) { }
    public record ConversaResponse(UUID id) { }
    public record RegistrarInteracaoRequest(@NotNull PapelInteracao papel, @NotNull OrigemInteracao origem, @NotBlank String conteudo) { }
}
