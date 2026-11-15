package br.com.zyven.financeiro.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ImportacaoOfxJpaRepository extends JpaRepository<ImportacaoOfxEntity, UUID> { boolean existsByHasharquivo(String hasharquivo); }
interface RegraCategorizacaoFinanceiraJpaRepository extends JpaRepository<RegraCategorizacaoFinanceiraEntity, UUID> {
    Optional<RegraCategorizacaoFinanceiraEntity> findByChavecomparacao(String chavecomparacao);
    Optional<RegraCategorizacaoFinanceiraEntity> findByTermobusca(String termobusca);
    List<RegraCategorizacaoFinanceiraEntity> findByTermobuscaIsNotNull();
}
interface LancamentoFinanceiroJpaRepository extends JpaRepository<LancamentoFinanceiroEntity, UUID> {
    boolean existsByContareferenciaAndIdentificadorofx(String contareferencia, String identificadorofx);
    List<LancamentoFinanceiroEntity> findTop20ByStatusOrderByDatalancamentoDesc(String status);
    long countByStatus(String status);
    List<LancamentoFinanceiroEntity> findByImportacaoidOrderByDatalancamentoDesc(UUID importacaoid);
    List<LancamentoFinanceiroEntity> findByChavecomparacaoAndStatus(String chavecomparacao, String status);
    @Query(value = "select l from LancamentoFinanceiroEntity l where :termo = '' or concat(' ', l.chavecomparacao, ' ') like concat('% ', :termo, ' %')",
           countQuery = "select count(l) from LancamentoFinanceiroEntity l where :termo = '' or concat(' ', l.chavecomparacao, ' ') like concat('% ', :termo, ' %')")
    Page<LancamentoFinanceiroEntity> consultar(@Param("termo") String termo, Pageable pagina);

    @Query("select count(l) from LancamentoFinanceiroEntity l where l.status = 'PENDENTE_REVISAO' and (:termo = '' or concat(' ', l.chavecomparacao, ' ') like concat('% ', :termo, ' %'))")
    long contarPendentes(@Param("termo") String termo);

    @Query("select l from LancamentoFinanceiroEntity l where l.status = 'PENDENTE_REVISAO' and concat(' ', l.chavecomparacao, ' ') like concat('% ', :termo, ' %')")
    List<LancamentoFinanceiroEntity> pendentesPorTermo(@Param("termo") String termo);
}
