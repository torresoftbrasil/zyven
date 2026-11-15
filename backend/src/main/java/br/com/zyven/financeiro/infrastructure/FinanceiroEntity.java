package br.com.zyven.financeiro.infrastructure;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import br.com.zyven.financeiro.domain.CategoriaFinanceira;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity @Table(name = "importacaoofx")
class ImportacaoOfxEntity {
    @Id private UUID id;
    private String nomearquivo;
    private String hasharquivo;
    private Instant datacadastro;
    protected ImportacaoOfxEntity() { }
    ImportacaoOfxEntity(String nomearquivo, String hasharquivo) { id = UUID.randomUUID(); this.nomearquivo = nomearquivo; this.hasharquivo = hasharquivo; datacadastro = Instant.now(); }
    UUID getId() { return id; }
    String getNomearquivo() { return nomearquivo; }
    Instant getDatacadastro() { return datacadastro; }
}

@Entity @Table(name = "regracategorizacaofinanceira")
class RegraCategorizacaoFinanceiraEntity {
    @Id private UUID id;
    private String chavecomparacao;
    @Enumerated(EnumType.STRING) private CategoriaFinanceira categoria;
    private String termobusca;
    private String descricaopadrao;
    private Instant datacadastro;
    private Instant dataatualizacao;
    protected RegraCategorizacaoFinanceiraEntity() { }
    RegraCategorizacaoFinanceiraEntity(String chavecomparacao, CategoriaFinanceira categoria) { id = UUID.randomUUID(); this.chavecomparacao = chavecomparacao; this.categoria = categoria; datacadastro = Instant.now(); dataatualizacao = datacadastro; }
    static RegraCategorizacaoFinanceiraEntity porTermo(String termo, String descricao, CategoriaFinanceira categoria) {
        var regra = new RegraCategorizacaoFinanceiraEntity("@TERMO:" + termo, categoria);
        regra.termobusca = termo;
        regra.descricaopadrao = descricao;
        return regra;
    }
    CategoriaFinanceira getCategoria() { return categoria; }
    String getTermobusca() { return termobusca; }
    String getDescricaopadrao() { return descricaopadrao; }
    void atualizar(CategoriaFinanceira categoria) { this.categoria = categoria; dataatualizacao = Instant.now(); }
    void atualizarDescricao(String descricao) { this.descricaopadrao = descricao; dataatualizacao = Instant.now(); }
}

@Entity @Table(name = "lancamentofinanceiro")
class LancamentoFinanceiroEntity {
    @Id private UUID id;
    private UUID importacaoid;
    private String contareferencia;
    private String identificadorofx;
    private LocalDate datalancamento;
    private BigDecimal valor;
    private String descricao;
    private String descricaooriginal;
    private String chavecomparacao;
    @Enumerated(EnumType.STRING) private CategoriaFinanceira categoria;
    private String origemcategoria;
    private BigDecimal confianca;
    private String status;
    private Instant datacadastro;
    private Instant dataatualizacao;
    protected LancamentoFinanceiroEntity() { }
    LancamentoFinanceiroEntity(UUID importacaoid, String conta, String identificador, LocalDate data, BigDecimal valor, String descricaoOriginal, String descricaoFinal, String chave, CategoriaFinanceira categoria) {
        id = UUID.randomUUID(); this.importacaoid = importacaoid; contareferencia = conta; identificadorofx = identificador; datalancamento = data; this.valor = valor; descricao = descricaoFinal; descricaooriginal = descricaoOriginal; chavecomparacao = chave; this.categoria = categoria;
        origemcategoria = categoria == null ? "REVISAO" : "REGRA"; status = categoria == null ? "PENDENTE_REVISAO" : "LANCADO"; datacadastro = Instant.now(); dataatualizacao = datacadastro;
    }
    UUID getId() { return id; } String getDescricao() { return descricao; } String getChaveComparacao() { return chavecomparacao; }
    String getDescricaooriginal() { return descricaooriginal; }
    UUID getImportacaoid() { return importacaoid; }
    LocalDate getDataLancamento() { return datalancamento; } BigDecimal getValor() { return valor; } CategoriaFinanceira getCategoria() { return categoria; }
    String getOrigemCategoria() { return origemcategoria; } BigDecimal getConfianca() { return confianca; } String getStatus() { return status; }
    void sugerir(CategoriaFinanceira categoria, BigDecimal confianca) { this.categoria = categoria; this.confianca = confianca; origemcategoria = "IA"; dataatualizacao = Instant.now(); }
    void confirmar(CategoriaFinanceira categoria) { this.categoria = categoria; confianca = BigDecimal.ONE; origemcategoria = "REGRA"; status = "LANCADO"; dataatualizacao = Instant.now(); }
    void categorizarParaRevisao(CategoriaFinanceira categoria) { this.categoria = categoria; confianca = null; origemcategoria = "REVISAO"; dataatualizacao = Instant.now(); }
    void renomear(String descricao) { this.descricao = descricao; dataatualizacao = Instant.now(); }
}
