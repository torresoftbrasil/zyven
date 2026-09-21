package br.com.zyven.planejamento.infrastructure;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import br.com.zyven.planejamento.domain.ClassificacaoTarefa;
import br.com.zyven.planejamento.domain.PrioridadeTarefa;
import br.com.zyven.planejamento.domain.StatusTarefa;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "grupotarefa")
class GrupoTarefaEntity {
    @Id private UUID id;
    private String nome;
    private String descricao;
    private String status;
    private LocalDate datainicio;
    private LocalDate datafim;
    private Instant datacadastro;
    private Instant dataatualizacao;
    protected GrupoTarefaEntity() { }
    public GrupoTarefaEntity(String nome, String descricao, LocalDate datainicio, LocalDate datafim) {
        id = UUID.randomUUID(); this.nome = nome; this.descricao = descricao; this.datainicio = datainicio; this.datafim = datafim;
        status = "ATIVO"; datacadastro = Instant.now(); dataatualizacao = datacadastro;
    }
    public UUID getId() { return id; }
    public String getNome() { return nome; }
    public String getDescricao() { return descricao; }
    public LocalDate getDataInicio() { return datainicio; }
    public LocalDate getDataFim() { return datafim; }
}

@Entity
@Table(name = "tarefa")
class TarefaEntity {
    @Id private UUID id;
    private UUID grupoid;
    private String titulo;
    private String descricao;
    @Enumerated(EnumType.STRING) private ClassificacaoTarefa classificacao;
    @Enumerated(EnumType.STRING) private PrioridadeTarefa prioridade;
    @Enumerated(EnumType.STRING) private StatusTarefa status;
    private LocalDate dataplanejada;
    private LocalDate datalimite;
    private LocalDate dataconclusao;
    private String origem;
    private Instant datacadastro;
    private Instant dataatualizacao;
    protected TarefaEntity() { }
    TarefaEntity(UUID grupoid, String titulo, String descricao, ClassificacaoTarefa classificacao, PrioridadeTarefa prioridade, StatusTarefa status, LocalDate dataplanejada, LocalDate datalimite, String origem) {
        id = UUID.randomUUID(); this.grupoid = grupoid; this.titulo = titulo; this.descricao = descricao; this.classificacao = classificacao;
        this.prioridade = prioridade; this.status = status; this.dataplanejada = dataplanejada; this.datalimite = datalimite; this.origem = origem;
        datacadastro = Instant.now(); dataatualizacao = datacadastro;
    }
    UUID getId() { return id; } UUID getGrupoId() { return grupoid; } String getTitulo() { return titulo; }
    ClassificacaoTarefa getClassificacao() { return classificacao; } PrioridadeTarefa getPrioridade() { return prioridade; }
    StatusTarefa getStatus() { return status; } LocalDate getDataPlanejada() { return dataplanejada; } LocalDate getDataLimite() { return datalimite; }
}

@Entity
@Table(name = "demandasugerida")
class DemandaSugeridaEntity {
    @Id private UUID id;
    private UUID interacaoid;
    private String titulogrupo;
    private String titulo;
    private String descricao;
    @Enumerated(EnumType.STRING) private ClassificacaoTarefa classificacao;
    @Enumerated(EnumType.STRING) private PrioridadeTarefa prioridade;
    private LocalDate dataplanejada;
    private LocalDate datalimite;
    private java.math.BigDecimal confianca;
    private String status;
    private Instant datacadastro;
    protected DemandaSugeridaEntity() { }
    DemandaSugeridaEntity(UUID interacaoId, String tituloGrupo, String titulo, String descricao, ClassificacaoTarefa classificacao, PrioridadeTarefa prioridade, LocalDate planejada, LocalDate limite, java.math.BigDecimal confianca) {
        id = UUID.randomUUID(); interacaoid = interacaoId; titulogrupo = tituloGrupo; this.titulo = titulo; this.descricao = descricao;
        this.classificacao = classificacao; this.prioridade = prioridade; dataplanejada = planejada; datalimite = limite;
        this.confianca = confianca; status = "PENDENTE"; datacadastro = Instant.now();
    }
    UUID getId() { return id; } String getTituloGrupo() { return titulogrupo; } String getTitulo() { return titulo; }
    ClassificacaoTarefa getClassificacao() { return classificacao; } PrioridadeTarefa getPrioridade() { return prioridade; }
    LocalDate getDataPlanejada() { return dataplanejada; } LocalDate getDataLimite() { return datalimite; } java.math.BigDecimal getConfianca() { return confianca; }
}
