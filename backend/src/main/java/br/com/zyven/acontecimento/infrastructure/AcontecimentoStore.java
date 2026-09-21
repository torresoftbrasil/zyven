package br.com.zyven.acontecimento.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import br.com.zyven.acontecimento.domain.ImportanciaAcontecimento;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class AcontecimentoStore {
    private final AcontecimentoJpaRepository acontecimentos;

    public AcontecimentoStore(AcontecimentoJpaRepository acontecimentos) {
        this.acontecimentos = acontecimentos;
    }

    @Transactional
    public Acontecimento registrar(String titulo, String descricao, String tipo, ImportanciaAcontecimento importancia) {
        return mapear(acontecimentos.save(new AcontecimentoEntity(titulo, descricao, tipo, importancia)));
    }

    @Transactional(readOnly = true)
    public List<Acontecimento> recentes() {
        return acontecimentos.findTop12ByOrderByDataocorrenciaDesc().stream().map(this::mapear).toList();
    }

    private Acontecimento mapear(AcontecimentoEntity item) {
        return new Acontecimento(item.getId(), item.getTitulo(), item.getDescricao(), item.getTipo(), item.getImportancia(), item.getDataOcorrencia());
    }

    public record Acontecimento(UUID id, String titulo, String descricao, String tipo, ImportanciaAcontecimento importancia, Instant dataocorrencia) { }
}
