package br.com.zyven.academia.infrastructure;

import br.com.zyven.academia.domain.Treino;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class AcademiaStore {
    private final JdbcTemplate jdbc;
    public AcademiaStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(readOnly = true)
    public List<Treino> listar() {
        return jdbc.query("select id, data, titulo from treino order by data desc, datacadastro desc limit 100", (rs, row) -> montar(rs));
    }

    @Transactional
    public List<Treino> importar(List<Treino> treinos) {
        if (treinos.size() > 14) throw new IllegalArgumentException("O limite é 14 treinos por importação.");
        List<Treino> salvos = new ArrayList<>();
        for (Treino treino : treinos) {
            validar(treino);
            UUID id = UUID.randomUUID();
            jdbc.update("insert into treino (id, data, titulo, origem, datacadastro, dataatualizacao) values (?, ?, ?, 'FOTO', now(), now())", id, treino.data(), treino.titulo());
            int ordem = 1;
            for (Treino.Exercicio exercicio : treino.exercicios()) {
                jdbc.update("insert into exerciciotreino (id, treinoid, ordem, nome, series, repeticoes, observacao) values (?, ?, ?, ?, ?, ?, ?)", UUID.randomUUID(), id, ordem++, exercicio.nome(), exercicio.series(), exercicio.repeticoes(), exercicio.observacao());
            }
            salvos.add(new Treino(id, treino.data(), treino.titulo(), treino.exercicios()));
        }
        return salvos;
    }

    @Transactional
    public Treino mover(UUID id, LocalDate data) {
        if (data == null) throw new IllegalArgumentException("Informe a data de destino.");
        int alterados = jdbc.update("update treino set data = ?, dataatualizacao = now() where id = ?", data, id);
        if (alterados == 0) throw new IllegalArgumentException("Treino não encontrado.");
        return jdbc.queryForObject("select id, data, titulo from treino where id = ?", (rs, row) -> montar(rs), id);
    }

    private Treino montar(ResultSet rs) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        List<Treino.Exercicio> exercicios = jdbc.query("select nome, series, repeticoes, observacao from exerciciotreino where treinoid = ? order by ordem", (item, row) -> new Treino.Exercicio(item.getString("nome"), item.getString("series"), item.getString("repeticoes"), item.getString("observacao")), id);
        return new Treino(id, rs.getObject("data", LocalDate.class), rs.getString("titulo"), exercicios);
    }

    private void validar(Treino treino) {
        if (treino.data() == null || treino.titulo() == null || treino.titulo().isBlank() || treino.titulo().length() > 160) throw new IllegalArgumentException("Treino precisa de data e título válidos.");
        if (treino.exercicios() == null || treino.exercicios().isEmpty() || treino.exercicios().size() > 40) throw new IllegalArgumentException("Treino precisa de 1 a 40 exercícios.");
        for (Treino.Exercicio exercicio : treino.exercicios()) {
            if (exercicio.nome() == null || exercicio.nome().isBlank() || exercicio.nome().length() > 160) throw new IllegalArgumentException("Nome de exercício inválido.");
            if (tamanho(exercicio.series()) > 80 || tamanho(exercicio.repeticoes()) > 80 || tamanho(exercicio.observacao()) > 300) throw new IllegalArgumentException("Dados do exercício excedem o limite.");
        }
    }
    private int tamanho(String texto) { return texto == null ? 0 : texto.length(); }
}
