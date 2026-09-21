package br.com.zyven.financeiro.infrastructure;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import br.com.zyven.financeiro.domain.CategoriaFinanceira;
import br.com.zyven.financeiro.domain.TransacaoOfx;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class FinanceiroStore {
    private final ImportacaoOfxJpaRepository importacoes;
    private final RegraCategorizacaoFinanceiraJpaRepository regras;
    private final LancamentoFinanceiroJpaRepository lancamentos;

    public FinanceiroStore(ImportacaoOfxJpaRepository importacoes, RegraCategorizacaoFinanceiraJpaRepository regras, LancamentoFinanceiroJpaRepository lancamentos) {
        this.importacoes = importacoes; this.regras = regras; this.lancamentos = lancamentos;
    }

    @Transactional
    public ResultadoImportacao salvarImportacao(String nomearquivo, String hasharquivo, List<TransacaoOfx> transacoes) {
        if (importacoes.existsByHasharquivo(hasharquivo)) throw new IllegalArgumentException("Este arquivo OFX já foi importado");
        ImportacaoOfxEntity importacao = importacoes.save(new ImportacaoOfxEntity(nomearquivo, hasharquivo));
        int duplicados = 0;
        List<PendenteParaAnalise> pendentes = new ArrayList<>();
        for (TransacaoOfx transacao : transacoes) {
            if (lancamentos.existsByContareferenciaAndIdentificadorofx(transacao.contareferencia(), transacao.identificador())) { duplicados++; continue; }
            String descricao = higienizarDescricao(transacao.descricao());
            String chave = chaveComparacao(descricao);
            CategoriaFinanceira categoria = regras.findByChavecomparacao(chave).map(RegraCategorizacaoFinanceiraEntity::getCategoria).orElse(null);
            LancamentoFinanceiroEntity lancamento = lancamentos.save(new LancamentoFinanceiroEntity(importacao.getId(), transacao.contareferencia(), transacao.identificador(), transacao.data(), transacao.valor(), descricao, chave, categoria));
            if (categoria == null) pendentes.add(new PendenteParaAnalise(lancamento.getId(), lancamento.getDescricao()));
        }
        return new ResultadoImportacao(importacao.getId(), transacoes.size() - duplicados, duplicados, pendentes);
    }

    @Transactional
    public void salvarSugestoes(List<SugestaoCategoria> sugestoes) {
        for (SugestaoCategoria sugestao : sugestoes) lancamentos.findById(sugestao.lancamentoid()).ifPresent(item -> item.sugerir(sugestao.categoria(), sugestao.confianca()));
    }

    @Transactional
    public Lancamento confirmar(UUID id, CategoriaFinanceira categoria) {
        LancamentoFinanceiroEntity item = lancamentos.findById(id).orElseThrow(() -> new IllegalArgumentException("Lançamento não encontrado"));
        RegraCategorizacaoFinanceiraEntity regra = regras.findByChavecomparacao(item.getChaveComparacao()).orElseGet(() -> new RegraCategorizacaoFinanceiraEntity(item.getChaveComparacao(), categoria));
        regra.atualizar(categoria); regras.save(regra);
        item.confirmar(categoria); return mapear(item);
    }

    @Transactional(readOnly = true)
    public Resumo resumo() {
        List<Lancamento> pendentes = lancamentos.findTop20ByStatusOrderByDatalancamentoDesc("PENDENTE_REVISAO").stream().map(this::mapear).toList();
        return new Resumo(lancamentos.countByStatus("LANCADO"), lancamentos.countByStatus("PENDENTE_REVISAO"), pendentes);
    }

    private Lancamento mapear(LancamentoFinanceiroEntity item) {
        return new Lancamento(item.getId(), item.getDataLancamento(), item.getValor(), item.getDescricao(), item.getCategoria(), item.getOrigemCategoria(), item.getConfianca(), item.getStatus());
    }
    private String higienizarDescricao(String descricao) {
        String texto = Normalizer.normalize(descricao == null ? "" : descricao, Normalizer.Form.NFKC).replaceAll("[\\p{Cntrl}]", " ").replaceAll("\\s+", " ").trim();
        return texto.isBlank() ? "Lançamento sem descrição" : texto.substring(0, Math.min(texto.length(), 500));
    }
    private String chaveComparacao(String descricao) {
        return Normalizer.normalize(descricao, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toUpperCase(java.util.Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", " ").replaceAll("\\b\\d{3,}\\b", " ").replaceAll("\\s+", " ").trim();
    }
    public record PendenteParaAnalise(UUID lancamentoid, String descricao) { }
    public record SugestaoCategoria(UUID lancamentoid, CategoriaFinanceira categoria, BigDecimal confianca) { }
    public record ResultadoImportacao(UUID importacaoid, int importados, int duplicados, List<PendenteParaAnalise> pendentes) { }
    public record Lancamento(UUID id, java.time.LocalDate data, BigDecimal valor, String descricao, CategoriaFinanceira categoria, String origemcategoria, BigDecimal confianca, String status) { }
    public record Resumo(long lancados, long pendentesrevisao, List<Lancamento> pendentes) { }
}
