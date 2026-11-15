package br.com.zyven.academia;

import br.com.zyven.academia.domain.Treino;
import br.com.zyven.academia.infrastructure.AcademiaStore;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class AcademiaStoreTest {
    @Autowired AcademiaStore store;

    @Test
    void importaExerciciosEMoveTreinoDeDia() {
        LocalDate sexta = LocalDate.of(2026, 11, 20);
        Treino treino = new Treino(null, sexta, "Pernas", List.of(new Treino.Exercicio("Agachamento", "4", "10", "Leve")));
        Treino salvo = store.importar(List.of(treino)).getFirst();
        assertThat(store.listar()).filteredOn(item -> item.id().equals(salvo.id()))
                .singleElement().satisfies(item -> assertThat(item.exercicios()).containsExactly(treino.exercicios().getFirst()));
        Treino movido = store.mover(salvo.id(), sexta.minusDays(1));
        assertThat(movido.data()).isEqualTo(sexta.minusDays(1));
        assertThat(movido.exercicios()).containsExactly(treino.exercicios().getFirst());
    }
}
