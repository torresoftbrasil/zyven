package br.com.zyven.financeiro.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ImportacaoOfxJpaRepository extends JpaRepository<ImportacaoOfxEntity, UUID> { boolean existsByHasharquivo(String hasharquivo); }
interface RegraCategorizacaoFinanceiraJpaRepository extends JpaRepository<RegraCategorizacaoFinanceiraEntity, UUID> { Optional<RegraCategorizacaoFinanceiraEntity> findByChavecomparacao(String chavecomparacao); }
interface LancamentoFinanceiroJpaRepository extends JpaRepository<LancamentoFinanceiroEntity, UUID> {
    boolean existsByContareferenciaAndIdentificadorofx(String contareferencia, String identificadorofx);
    List<LancamentoFinanceiroEntity> findTop20ByStatusOrderByDatalancamentoDesc(String status);
    long countByStatus(String status);
}
