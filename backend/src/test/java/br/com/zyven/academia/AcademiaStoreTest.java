package br.com.zyven.academia;

import br.com.zyven.academia.domain.Treino;
import br.com.zyven.academia.infrastructure.AcademiaStore;
import br.com.zyven.academia.domain.TreinoInvalidoException;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
                .singleElement().satisfies(item -> assertThat(item.exercicios().getFirst().nome()).isEqualTo("Agachamento"));
        Treino movido = store.mover(salvo.id(), sexta.minusDays(1));
        assertThat(movido.data()).isEqualTo(sexta.minusDays(1));
        Treino.Exercicio exercicio = movido.exercicios().getFirst();
        assertThat(exercicio.pausasegundos()).isEqualTo(60);
        for (int serie = 1; serie <= 4; serie++) {
            Treino registrado = store.registrarSerie(salvo.id(), exercicio.id(), new BigDecimal(serie <= 2 ? "20.5" : "30.5"));
            assertThat(registrado.exercicios().getFirst().seriesconcluidas()).isEqualTo(serie);
            assertThat(registrado.exercicios().getFirst().seriesregistradas()).hasSize(serie);
        }
        Treino finalizado = store.listar().stream().filter(item -> item.id().equals(salvo.id())).findFirst().orElseThrow();
        assertThat(finalizado.exercicios().getFirst().seriesregistradas().getFirst().carga()).isEqualByComparingTo("20.5");
        assertThat(finalizado.exercicios().getFirst().seriesregistradas().getLast().carga()).isEqualByComparingTo("30.5");
        assertThatThrownBy(() -> store.registrarSerie(salvo.id(), exercicio.id(), null))
                .isInstanceOf(TreinoInvalidoException.class);
    }
}
