package br.com.zyven.conversa.application;

import java.util.List;
import java.util.UUID;

import br.com.zyven.conversa.domain.OrigemInteracao;
import br.com.zyven.conversa.domain.PapelInteracao;
import br.com.zyven.conversa.infrastructure.ConversaStore;
import br.com.zyven.assistente.application.AnalisarDemandas;
import br.com.zyven.planejamento.infrastructure.PlanejamentoStore;
import org.springframework.stereotype.Service;

@Service
public class GerenciarConversa {
    private final ConversaStore conversas;
    private final PlanejamentoStore planejamento;
    private final AnalisarDemandas analisarDemandas;
    public GerenciarConversa(ConversaStore conversas, PlanejamentoStore planejamento, AnalisarDemandas analisarDemandas) { this.conversas = conversas; this.planejamento = planejamento; this.analisarDemandas = analisarDemandas; }
    public UUID iniciar(String titulo) { return conversas.criar(titulo == null || titulo.isBlank() ? "Conversa com Zyven" : titulo.trim()); }
    public void registrar(UUID conversaId, PapelInteracao papel, OrigemInteracao origem, String conteudo) {
        UUID interacaoId = conversas.registrar(conversaId, papel, origem, conteudo.trim());
        if (papel == PapelInteracao.USUARIO) analisarDemandas.executar(interacaoId, conteudo.trim());
    }
    public Contexto montarContexto(UUID conversaId) {
        List<ConversaStore.ResumoInteracao> interacoes = conversas.recentes(conversaId);
        List<PlanejamentoStore.Tarefa> tarefas = planejamento.pendentes();
        return new Contexto(conversaId, interacoes, tarefas, planejamento.demandasPendentes(), "O backend Zyven é a fonte de verdade. Não afirme criar, concluir ou alterar uma tarefa sem resposta explícita de uma ferramenta do backend.");
    }
    public record Contexto(UUID conversaid, List<ConversaStore.ResumoInteracao> interacoesrecentes, List<PlanejamentoStore.Tarefa> tarefaspendentes, List<PlanejamentoStore.Demanda> demandassugeridas, String regraoperacional) { }
}
