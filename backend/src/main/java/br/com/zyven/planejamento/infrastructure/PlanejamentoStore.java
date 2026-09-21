package br.com.zyven.planejamento.infrastructure;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import br.com.zyven.planejamento.domain.ClassificacaoTarefa;
import br.com.zyven.planejamento.domain.PrioridadeTarefa;
import br.com.zyven.planejamento.domain.StatusTarefa;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class PlanejamentoStore {
    private final GrupoTarefaJpaRepository grupos;
    private final TarefaJpaRepository tarefas;
    private final DemandaSugeridaJpaRepository demandas;
    public PlanejamentoStore(GrupoTarefaJpaRepository grupos, TarefaJpaRepository tarefas, DemandaSugeridaJpaRepository demandas) { this.grupos = grupos; this.tarefas = tarefas; this.demandas = demandas; }
    @Transactional public Grupo criarGrupo(String nome, String descricao, LocalDate inicio, LocalDate fim) {
        GrupoTarefaEntity grupo = grupos.save(new GrupoTarefaEntity(nome, descricao, inicio, fim));
        return new Grupo(grupo.getId(), grupo.getNome(), grupo.getDescricao(), grupo.getDataInicio(), grupo.getDataFim());
    }
    @Transactional public Tarefa criarTarefa(UUID grupoId, String titulo, String descricao, ClassificacaoTarefa classificacao, PrioridadeTarefa prioridade, LocalDate planejada, LocalDate limite) {
        if (grupoId != null && !grupos.existsById(grupoId)) throw new IllegalArgumentException("Grupo de tarefas não encontrado");
        TarefaEntity tarefa = tarefas.save(new TarefaEntity(grupoId, titulo, descricao, classificacao, prioridade, StatusTarefa.PENDENTE, planejada, limite, "USUARIO"));
        return mapear(tarefa);
    }
    @Transactional(readOnly = true) public List<Tarefa> pendentes() {
        return tarefas.findTop20ByStatusInOrderByDatalimiteAsc(List.of(StatusTarefa.PENDENTE, StatusTarefa.EM_ANDAMENTO, StatusTarefa.SUGERIDA)).stream().map(this::mapear).toList();
    }
    @Transactional public void sugerirDemanda(UUID interacaoId, String grupo, String titulo, String descricao, ClassificacaoTarefa classificacao, PrioridadeTarefa prioridade, LocalDate planejada, LocalDate limite, java.math.BigDecimal confianca) {
        demandas.save(new DemandaSugeridaEntity(interacaoId, grupo, titulo, descricao, classificacao, prioridade, planejada, limite, confianca));
    }
    @Transactional(readOnly = true) public List<Demanda> demandasPendentes() {
        return demandas.findTop20ByStatusOrderByDatacadastroDesc("PENDENTE").stream().map(item -> new Demanda(item.getId(), item.getTituloGrupo(), item.getTitulo(), item.getClassificacao(), item.getPrioridade(), item.getDataPlanejada(), item.getDataLimite(), item.getConfianca())).toList();
    }
    private Tarefa mapear(TarefaEntity item) { return new Tarefa(item.getId(), item.getGrupoId(), item.getTitulo(), item.getClassificacao(), item.getPrioridade(), item.getStatus(), item.getDataPlanejada(), item.getDataLimite()); }
    public record Grupo(UUID id, String nome, String descricao, LocalDate datainicio, LocalDate datafim) { }
    public record Tarefa(UUID id, UUID grupoid, String titulo, ClassificacaoTarefa classificacao, PrioridadeTarefa prioridade, StatusTarefa status, LocalDate dataplanejada, LocalDate datalimite) { }
    public record Demanda(UUID id, String titulogrupo, String titulo, ClassificacaoTarefa classificacao, PrioridadeTarefa prioridade, LocalDate dataplanejada, LocalDate datalimite, java.math.BigDecimal confianca) { }
}
