package br.com.zyven.acontecimento.infrastructure;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface AcontecimentoJpaRepository extends JpaRepository<AcontecimentoEntity, UUID> {
    List<AcontecimentoEntity> findTop12ByOrderByDataocorrenciaDesc();
}
