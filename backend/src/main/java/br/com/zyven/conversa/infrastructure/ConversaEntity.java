package br.com.zyven.conversa.infrastructure;

import java.time.Instant;
import java.util.UUID;

import br.com.zyven.conversa.domain.OrigemInteracao;
import br.com.zyven.conversa.domain.PapelInteracao;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "conversa")
public class ConversaEntity {
    @Id private UUID id;
    private String titulo;
    private String status;
    private Instant datacadastro;
    private Instant dataatualizacao;

    protected ConversaEntity() { }
    public ConversaEntity(UUID id, String titulo) {
        this.id = id; this.titulo = titulo; status = "ATIVA";
        datacadastro = Instant.now(); dataatualizacao = datacadastro;
    }
    public UUID getId() { return id; }
    public String getTitulo() { return titulo; }
}

@Entity
@Table(name = "interacao")
class InteracaoEntity {
    @Id private UUID id;
    private UUID conversaid;
    @Enumerated(EnumType.STRING) private PapelInteracao papel;
    @Enumerated(EnumType.STRING) private OrigemInteracao origem;
    private String conteudo;
    private Instant datacadastro;

    protected InteracaoEntity() { }
    InteracaoEntity(UUID conversaid, PapelInteracao papel, OrigemInteracao origem, String conteudo) {
        id = UUID.randomUUID(); this.conversaid = conversaid; this.papel = papel; this.origem = origem;
        this.conteudo = conteudo; datacadastro = Instant.now();
    }
    UUID getId() { return id; }
    UUID getConversaId() { return conversaid; }
    PapelInteracao getPapel() { return papel; }
    String getConteudo() { return conteudo; }
    Instant getDataCadastro() { return datacadastro; }
}
