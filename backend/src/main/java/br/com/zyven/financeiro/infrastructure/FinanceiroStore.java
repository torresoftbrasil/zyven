package br.com.zyven.financeiro.infrastructure;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.PageRequest;

import br.com.zyven.financeiro.domain.CategoriaFinanceira;
import br.com.zyven.financeiro.domain.ImportacaoDuplicadaException;
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
        if (importacoes.existsByHasharquivo(hasharquivo)) throw new ImportacaoDuplicadaException();
        ImportacaoOfxEntity importacao = importacoes.save(new ImportacaoOfxEntity(nomearquivo, hasharquivo));
        List<RegraCategorizacaoFinanceiraEntity> regrasPorTermo = regras.findByTermobuscaIsNotNull().stream()
                .sorted(Comparator.comparingInt((RegraCategorizacaoFinanceiraEntity regra) -> regra.getTermobusca().length()).reversed()).toList();
        int duplicados = 0;
        List<PendenteParaAnalise> pendentes = new ArrayList<>();
        for (TransacaoOfx transacao : transacoes) {
            if (lancamentos.existsByContareferenciaAndIdentificadorofx(transacao.contareferencia(), transacao.identificador())) { duplicados++; continue; }
            String descricao = higienizarDescricao(transacao.descricao());
            String chave = chaveComparacao(descricao);
            RegraCategorizacaoFinanceiraEntity regra = regrasPorTermo.stream().filter(item -> contemTermo(chave, item.getTermobusca())).findFirst()
                    .orElseGet(() -> regras.findByChavecomparacao(chave).orElse(null));
            CategoriaFinanceira categoria = regra == null ? null : regra.getCategoria();
            String descricaoFinal = regra != null && regra.getDescricaopadrao() != null ? regra.getDescricaopadrao() : descricao;
            LancamentoFinanceiroEntity lancamento = lancamentos.save(new LancamentoFinanceiroEntity(importacao.getId(), transacao.contareferencia(), transacao.identificador(), transacao.data(), transacao.valor(), descricao, descricaoFinal, chave, categoria));
            if (categoria == null) pendentes.add(new PendenteParaAnalise(lancamento.getId(), lancamento.getDescricao()));
        }
        return new ResultadoImportacao(importacao.getId(), transacoes.size() - duplicados, duplicados, pendentes);
    }

    @Transactional
    public void salvarSugestoes(List<SugestaoCategoria> sugestoes) {
        for (SugestaoCategoria sugestao : sugestoes) lancamentos.findById(sugestao.lancamentoid()).filter(item -> "PENDENTE_REVISAO".equals(item.getStatus())).ifPresent(item -> item.sugerir(sugestao.categoria(), sugestao.confianca()));
    }

    @Transactional
    public Lancamento confirmar(UUID id, CategoriaFinanceira categoria) {
        LancamentoFinanceiroEntity item = lancamentos.findById(id).orElseThrow(() -> new IllegalArgumentException("Lançamento não encontrado"));
        RegraCategorizacaoFinanceiraEntity regra = regras.findByChavecomparacao(item.getChaveComparacao()).orElseGet(() -> new RegraCategorizacaoFinanceiraEntity(item.getChaveComparacao(), categoria));
        regra.atualizar(categoria); regras.save(regra);
        if (!item.getDescricao().equals(item.getDescricaooriginal())) regra.atualizarDescricao(item.getDescricao());
        item.confirmar(categoria);
        for (LancamentoFinanceiroEntity similar : lancamentos.findByChavecomparacaoAndStatus(item.getChaveComparacao(), "PENDENTE_REVISAO")) {
            similar.confirmar(categoria);
            if (regra.getDescricaopadrao() != null) similar.renomear(regra.getDescricaopadrao());
        }
        return mapear(item);
    }

    @Transactional
    public Lancamento renomear(UUID id, String descricao) {
        LancamentoFinanceiroEntity item = lancamentos.findById(id).orElseThrow(() -> new IllegalArgumentException("Lançamento não encontrado"));
        String nome = validarDescricao(descricao);
        RegraCategorizacaoFinanceiraEntity regra = regras.findByChavecomparacao(item.getChaveComparacao())
                .orElseGet(() -> new RegraCategorizacaoFinanceiraEntity(item.getChaveComparacao(), null));
        regra.atualizarDescricao(nome);
        regras.save(regra);
        item.renomear(nome);
        return mapear(item);
    }

    @Transactional
    public ResultadoRegraEmLote aplicarRegraEmLote(String termo, String descricao, CategoriaFinanceira categoria) {
        String busca = chaveComparacao(termo);
        if (busca.length() < 3 || busca.length() > 120) throw new IllegalArgumentException("Informe um termo de 3 a 120 caracteres para a regra");
        String nome = validarDescricao(descricao);
        RegraCategorizacaoFinanceiraEntity regra = regras.findByTermobusca(busca)
                .orElseGet(() -> RegraCategorizacaoFinanceiraEntity.porTermo(busca, nome, categoria));
        regra.atualizar(categoria);
        regra.atualizarDescricao(nome);
        regras.save(regra);
        int afetados = 0;
        for (LancamentoFinanceiroEntity item : lancamentos.findAll()) {
            if (!contemTermo(item.getChaveComparacao(), busca)) continue;
            item.renomear(nome);
            item.confirmar(categoria);
            afetados++;
        }
        return new ResultadoRegraEmLote(afetados, busca, nome, categoria);
    }

    @Transactional
    public ResultadoRevisaoEmLote renomearPendentesPorTermo(String termo, String descricao) {
        String busca = validarTermo(termo);
        String nome = validarDescricao(descricao);
        List<LancamentoFinanceiroEntity> itens = lancamentos.pendentesPorTermo(busca);
        if (itens.isEmpty()) return new ResultadoRevisaoEmLote(0, busca, nome, null);
        RegraCategorizacaoFinanceiraEntity regra = regras.findByTermobusca(busca)
                .orElseGet(() -> RegraCategorizacaoFinanceiraEntity.porTermo(busca, nome, null));
        regra.atualizarDescricao(nome);
        regras.save(regra);
        for (LancamentoFinanceiroEntity item : itens) item.renomear(nome);
        return new ResultadoRevisaoEmLote(itens.size(), busca, nome, null);
    }

    @Transactional
    public ResultadoRevisaoEmLote categorizarPendentesPorTermo(String termo, CategoriaFinanceira categoria) {
        String busca = validarTermo(termo);
        if (categoria == null) throw new IllegalArgumentException("Informe uma categoria para os lançamentos selecionados");
        List<LancamentoFinanceiroEntity> itens = lancamentos.pendentesPorTermo(busca);
        for (LancamentoFinanceiroEntity item : itens) item.categorizarParaRevisao(categoria);
        return new ResultadoRevisaoEmLote(itens.size(), busca, null, categoria);
    }

    @Transactional
    public ResultadoRevisaoEmLote confirmarPendentesPorTermo(String termo, CategoriaFinanceira categoriaSolicitada) {
        String busca = validarTermo(termo);
        List<LancamentoFinanceiroEntity> itens = lancamentos.pendentesPorTermo(busca);
        if (itens.isEmpty()) return new ResultadoRevisaoEmLote(0, busca, null, categoriaSolicitada);
        CategoriaFinanceira categoria = categoriaSolicitada;
        if (categoria == null) {
            categoria = itens.getFirst().getCategoria();
            CategoriaFinanceira categoriaInicial = categoria;
            if (categoria == null || itens.stream().anyMatch(item -> item.getCategoria() != categoriaInicial)) {
                throw new IllegalArgumentException("Os lançamentos selecionados não têm uma categoria única. Informe a categoria antes de confirmar.");
            }
        }
        String descricao = itens.getFirst().getDescricao();
        boolean descricaoUnica = itens.stream().allMatch(item -> item.getDescricao().equals(descricao));
        RegraCategorizacaoFinanceiraEntity regra = regras.findByTermobusca(busca)
                .orElseGet(() -> RegraCategorizacaoFinanceiraEntity.porTermo(busca, null, null));
        regra.atualizar(categoria);
        if (descricaoUnica) regra.atualizarDescricao(descricao);
        regras.save(regra);
        for (LancamentoFinanceiroEntity item : itens) item.confirmar(categoria);
        return new ResultadoRevisaoEmLote(itens.size(), busca, descricaoUnica ? descricao : null, categoria);
    }

    private String validarTermo(String termo) {
        String busca = chaveComparacao(termo == null ? "" : termo);
        if (busca.length() < 3 || busca.length() > 120) throw new IllegalArgumentException("Informe um termo de 3 a 120 caracteres");
        return busca;
    }

    @Transactional(readOnly = true)
    public Resumo resumo() {
        List<Lancamento> pendentes = lancamentos.findTop20ByStatusOrderByDatalancamentoDesc("PENDENTE_REVISAO").stream().map(this::mapear).toList();
        return new Resumo(lancamentos.countByStatus("LANCADO"), lancamentos.countByStatus("PENDENTE_REVISAO"), pendentes);
    }

    @Transactional(readOnly = true)
    public ConsultaLancamentos consultarLancamentos(String termo, int pagina) {
        if (pagina < 0 || pagina > 10000) throw new IllegalArgumentException("Página de consulta inválida");
        String busca = termo == null || termo.isBlank() ? "" : chaveComparacao(termo);
        if (termo != null && termo.length() > 120) throw new IllegalArgumentException("Informe um termo de até 120 caracteres");
        var resultado = lancamentos.consultar(busca, PageRequest.of(pagina, 12, Sort.by(Sort.Direction.DESC, "datalancamento", "id")));
        List<Lancamento> amostra = resultado.getContent().stream().map(this::mapear).map(item ->
                new Lancamento(item.id(), item.data(), item.valor(), mascararDescricao(item.descricao()), item.categoria(), item.origemcategoria(), item.confianca(), item.status())).toList();
        return new ConsultaLancamentos(busca, resultado.getTotalElements(), lancamentos.contarPendentes(busca), pagina, resultado.getTotalPages(), amostra);
    }

    @Transactional(readOnly = true)
    public List<Importacao> importacoes() {
        return importacoes(null);
    }

    @Transactional(readOnly = true)
    public List<Importacao> importacoes(String termo) {
        String busca = termo == null || termo.isBlank() ? "" : chaveComparacao(termo);
        if (termo != null && termo.length() > 120) throw new IllegalArgumentException("Informe um termo de até 120 caracteres");
        return importacoes.findAll(Sort.by(Sort.Direction.DESC, "datacadastro")).stream().map(importacao -> {
            List<Lancamento> itens = lancamentos.findByImportacaoidOrderByDatalancamentoDesc(importacao.getId()).stream()
                    .filter(item -> busca.isEmpty() || contemTermo(item.getChaveComparacao(), busca)).map(this::mapear).toList();
            return new Importacao(importacao.getId(), importacao.getNomearquivo(), importacao.getDatacadastro(), itens);
        }).filter(importacao -> busca.isEmpty() || !importacao.lancamentos().isEmpty()).toList();
    }

    private Lancamento mapear(LancamentoFinanceiroEntity item) {
        return new Lancamento(item.getId(), item.getDataLancamento(), item.getValor(), item.getDescricao(), item.getCategoria(), item.getOrigemCategoria(), item.getConfianca(), item.getStatus());
    }
    private String higienizarDescricao(String descricao) {
        String texto = Normalizer.normalize(descricao == null ? "" : descricao, Normalizer.Form.NFKC).replaceAll("[\\p{Cntrl}]", " ").replaceAll("\\s+", " ").trim();
        return texto.isBlank() ? "Lançamento sem descrição" : texto.substring(0, Math.min(texto.length(), 500));
    }
    private String mascararDescricao(String descricao) {
        return descricao.replaceAll("(?i)[\\w.+-]+@[\\w.-]+\\.[a-z]{2,}", "[email]")
                .replaceAll("\\b\\d{6,}\\b", "[numero]");
    }
    private String chaveComparacao(String descricao) {
        String chave = Normalizer.normalize(descricao, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toUpperCase(java.util.Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", " ").replaceAll("\\b\\d+\\b", " ").replaceAll("\\s+", " ").trim();
        return chave.substring(0, Math.min(chave.length(), 255));
    }
    private boolean contemTermo(String chave, String termo) {
        return (" " + chave + " ").contains(" " + termo + " ");
    }
    private String validarDescricao(String descricao) {
        String nome = higienizarDescricao(descricao);
        if (descricao == null || descricao.isBlank() || nome.length() > 255) throw new IllegalArgumentException("A descrição deve ter de 1 a 255 caracteres");
        return nome;
    }
    public record PendenteParaAnalise(UUID lancamentoid, String descricao) { }
    public record SugestaoCategoria(UUID lancamentoid, CategoriaFinanceira categoria, BigDecimal confianca) { }
    public record ResultadoImportacao(UUID importacaoid, int importados, int duplicados, List<PendenteParaAnalise> pendentes) { }
    public record Lancamento(UUID id, java.time.LocalDate data, BigDecimal valor, String descricao, CategoriaFinanceira categoria, String origemcategoria, BigDecimal confianca, String status) { }
    public record Resumo(long lancados, long pendentesrevisao, List<Lancamento> pendentes) { }
    public record ConsultaLancamentos(String termo, long total, long pendentesrevisao, int pagina, int totalpaginas, List<Lancamento> lancamentos) { }
    public record Importacao(UUID id, String nomearquivo, java.time.Instant datacadastro, List<Lancamento> lancamentos) { }
    public record ResultadoRegraEmLote(int afetados, String termo, String descricao, CategoriaFinanceira categoria) { }
    public record ResultadoRevisaoEmLote(int afetados, String termo, String descricao, CategoriaFinanceira categoria) { }
}
