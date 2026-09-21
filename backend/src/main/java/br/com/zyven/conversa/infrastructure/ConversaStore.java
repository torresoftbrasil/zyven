package br.com.zyven.conversa.infrastructure;

import java.util.List;
import java.util.UUID;

import br.com.zyven.conversa.domain.OrigemInteracao;
import br.com.zyven.conversa.domain.PapelInteracao;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class ConversaStore {
    private final ConversaJpaRepository conversas;
    private final InteracaoJpaRepository interacoes;

    public ConversaStore(ConversaJpaRepository conversas, InteracaoJpaRepository interacoes) {
        this.conversas = conversas; this.interacoes = interacoes;
    }
    @Transactional public UUID criar(String titulo) { return conversas.save(new ConversaEntity(UUID.randomUUID(), titulo)).getId(); }
    @Transactional public UUID registrar(UUID conversaId, PapelInteracao papel, OrigemInteracao origem, String conteudo) {
        if (!conversas.existsById(conversaId)) throw new IllegalArgumentException("Conversa não encontrada");
        return interacoes.save(new InteracaoEntity(conversaId, papel, origem, conteudo)).getId();
    }
    @Transactional(readOnly = true) public List<ResumoInteracao> recentes(UUID conversaId) {
        return interacoes.findTop12ByConversaidOrderByDatacadastroDesc(conversaId).reversed().stream()
                .map(item -> new ResumoInteracao(item.getPapel(), item.getConteudo())).toList();
    }
    public record ResumoInteracao(PapelInteracao papel, String conteudo) { }
}
