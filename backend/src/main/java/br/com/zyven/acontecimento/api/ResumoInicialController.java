package br.com.zyven.acontecimento.api;

import java.time.LocalDate;
import java.util.List;

import br.com.zyven.acontecimento.infrastructure.AcontecimentoStore;
import br.com.zyven.planejamento.infrastructure.PlanejamentoStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/resumo-inicial")
public class ResumoInicialController {
    private final AcontecimentoStore acontecimentos;
    private final PlanejamentoStore planejamento;

    public ResumoInicialController(AcontecimentoStore acontecimentos, PlanejamentoStore planejamento) {
        this.acontecimentos = acontecimentos;
        this.planejamento = planejamento;
    }

    @GetMapping
    ResumoInicialResponse consultar() {
        List<PlanejamentoStore.Tarefa> pendentes = planejamento.pendentes();
        LocalDate hoje = LocalDate.now();
        return new ResumoInicialResponse(
                acontecimentos.recentes(),
                pendentes.size(),
                pendentes.stream().filter(item -> hoje.equals(item.dataplanejada()) || hoje.equals(item.datalimite())).toList()
        );
    }

    record ResumoInicialResponse(List<AcontecimentoStore.Acontecimento> acontecimentos, int tarefaspendentes, List<PlanejamentoStore.Tarefa> tarefasdehoje) { }
}
