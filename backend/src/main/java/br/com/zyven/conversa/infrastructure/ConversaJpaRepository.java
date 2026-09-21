package br.com.zyven.conversa.infrastructure;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ConversaJpaRepository extends JpaRepository<ConversaEntity, UUID> { }

interface InteracaoJpaRepository extends JpaRepository<InteracaoEntity, UUID> {
    List<InteracaoEntity> findTop12ByConversaidOrderByDatacadastroDesc(UUID conversaid);
}
