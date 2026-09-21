package br.com.zyven.planejamento.infrastructure;

import java.util.List;
import java.util.UUID;

import br.com.zyven.planejamento.domain.StatusTarefa;
import org.springframework.data.jpa.repository.JpaRepository;

interface GrupoTarefaJpaRepository extends JpaRepository<GrupoTarefaEntity, UUID> { }

interface TarefaJpaRepository extends JpaRepository<TarefaEntity, UUID> {
    List<TarefaEntity> findTop20ByStatusInOrderByDatalimiteAsc(List<StatusTarefa> status);
}

interface DemandaSugeridaJpaRepository extends JpaRepository<DemandaSugeridaEntity, UUID> {
    List<DemandaSugeridaEntity> findTop20ByStatusOrderByDatacadastroDesc(String status);
}
