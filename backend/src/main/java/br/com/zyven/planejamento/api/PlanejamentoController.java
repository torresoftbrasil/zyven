package br.com.zyven.planejamento.api;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import br.com.zyven.planejamento.domain.ClassificacaoTarefa;
import br.com.zyven.planejamento.domain.PrioridadeTarefa;
import br.com.zyven.planejamento.infrastructure.PlanejamentoStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PlanejamentoController {
    private final PlanejamentoStore planejamento;
    public PlanejamentoController(PlanejamentoStore planejamento) { this.planejamento = planejamento; }
    @PostMapping("/grupostarefas") @ResponseStatus(HttpStatus.CREATED) PlanejamentoStore.Grupo criarGrupo(@Valid @RequestBody GrupoRequest request) {
        return planejamento.criarGrupo(request.nome(), request.descricao(), request.datainicio(), request.datafim());
    }
    @PostMapping("/tarefas") @ResponseStatus(HttpStatus.CREATED) PlanejamentoStore.Tarefa criarTarefa(@Valid @RequestBody TarefaRequest request) {
        return planejamento.criarTarefa(request.grupoid(), request.titulo(), request.descricao(), request.classificacao(), request.prioridade(), request.dataplanejada(), request.datalimite());
    }
    @GetMapping("/tarefas") List<PlanejamentoStore.Tarefa> listarPendentes() { return planejamento.pendentes(); }
    public record GrupoRequest(@NotBlank String nome, String descricao, LocalDate datainicio, LocalDate datafim) { }
    public record TarefaRequest(UUID grupoid, @NotBlank String titulo, String descricao, @NotNull ClassificacaoTarefa classificacao, @NotNull PrioridadeTarefa prioridade, LocalDate dataplanejada, LocalDate datalimite) { }
}
