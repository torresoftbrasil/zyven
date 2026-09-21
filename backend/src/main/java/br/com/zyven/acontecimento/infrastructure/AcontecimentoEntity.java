package br.com.zyven.acontecimento.infrastructure;

import java.time.Instant;
import java.util.UUID;

import br.com.zyven.acontecimento.domain.ImportanciaAcontecimento;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "acontecimento")
class AcontecimentoEntity {
    @Id private UUID id;
    private String titulo;
    private String descricao;
    private String tipo;
    @Enumerated(EnumType.STRING) private ImportanciaAcontecimento importancia;
    private Instant dataocorrencia;

    protected AcontecimentoEntity() { }

    AcontecimentoEntity(String titulo, String descricao, String tipo, ImportanciaAcontecimento importancia) {
        this.id = UUID.randomUUID();
        this.titulo = titulo;
        this.descricao = descricao;
        this.tipo = tipo;
        this.importancia = importancia;
        this.dataocorrencia = Instant.now();
    }

    UUID getId() { return id; }
    String getTitulo() { return titulo; }
    String getDescricao() { return descricao; }
    String getTipo() { return tipo; }
    ImportanciaAcontecimento getImportancia() { return importancia; }
    Instant getDataOcorrencia() { return dataocorrencia; }
}
