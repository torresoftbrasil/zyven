package br.com.zyven.academia.infrastructure;

import br.com.zyven.academia.domain.Treino;
import br.com.zyven.academia.domain.TreinoInvalidoException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
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
    public List<Treino> importar(List<Treino> treinos) { return importar(treinos, "FOTO"); }

    @Transactional
    public List<Treino> importar(List<Treino> treinos, String origem) {
        if (treinos.size() > 35) throw new TreinoInvalidoException("O limite é 35 treinos por importação.");
        if (!List.of("FOTO", "TEXTO", "MANUAL").contains(origem)) throw new TreinoInvalidoException("Origem inválida.");
        List<Treino> salvos = new ArrayList<>();
        for (Treino treino : treinos) {
            validar(treino);
            UUID id = UUID.randomUUID();
            jdbc.update("insert into treino (id, data, titulo, origem, datacadastro, dataatualizacao) values (?, ?, ?, ?, now(), now())", id, treino.data(), treino.titulo(), origem);
            int ordem = 1;
            for (Treino.Exercicio exercicio : treino.exercicios()) {
                jdbc.update("insert into exerciciotreino (id, treinoid, ordem, nome, series, repeticoes, observacao, pausasegundos) values (?, ?, ?, ?, ?, ?, ?, ?)", UUID.randomUUID(), id, ordem++, exercicio.nome(), exercicio.series(), exercicio.repeticoes(), exercicio.observacao(), exercicio.pausasegundos() == null ? 60 : exercicio.pausasegundos());
            }
            salvos.add(jdbc.queryForObject("select id, data, titulo from treino where id = ?", (rs, row) -> montar(rs), id));
        }
        return salvos;
    }

    @Transactional
    public Treino mover(UUID id, LocalDate data) {
        if (data == null) throw new TreinoInvalidoException("Informe a data de destino.");
        int alterados = jdbc.update("update treino set data = ?, dataatualizacao = now() where id = ?", data, id);
        if (alterados == 0) throw new TreinoInvalidoException("Treino não encontrado.");
        return jdbc.queryForObject("select id, data, titulo from treino where id = ?", (rs, row) -> montar(rs), id);
    }

    @Transactional
    public Treino registrarSerie(UUID treinoId, UUID exercicioId, BigDecimal carga) {
        if (carga != null && (carga.signum() < 0 || carga.compareTo(new BigDecimal("2000")) > 0)) throw new TreinoInvalidoException("Carga inválida.");
        List<SerieAtualizada> atualizadas = jdbc.query("update exerciciotreino set seriesconcluidas = seriesconcluidas + 1, carga = coalesce(?, carga) where id = ? and treinoid = ? and seriesconcluidas < coalesce(nullif(substring(series from '^[0-9]+'), '')::integer, 1) returning seriesconcluidas, carga",
                (rs, row) -> new SerieAtualizada(rs.getInt("seriesconcluidas"), rs.getBigDecimal("carga")), carga, exercicioId, treinoId);
        if (atualizadas.isEmpty()) throw new TreinoInvalidoException("Exercício não encontrado ou séries já concluídas.");
        SerieAtualizada atualizada = atualizadas.getFirst();
        jdbc.update("insert into serietreino (id, exercicioid, numero, carga, dataconclusao) values (?, ?, ?, ?, now())", UUID.randomUUID(), exercicioId, atualizada.numero(), atualizada.carga());
        return jdbc.queryForObject("select id, data, titulo from treino where id = ?", (rs, row) -> montar(rs), treinoId);
    }

    private record SerieAtualizada(int numero, BigDecimal carga) { }

    @Transactional
    public Treino definirVideo(UUID treinoId, UUID exercicioId, String url) {
        if (url == null || !url.matches("https://www\\.youtube\\.com/watch\\?v=[A-Za-z0-9_-]{11}")) throw new TreinoInvalidoException("Vídeo inválido.");
        String nome = jdbc.query("select nome from exerciciotreino where id = ? and treinoid = ?", rs -> rs.next() ? rs.getString(1) : null, exercicioId, treinoId);
        if (nome == null) throw new TreinoInvalidoException("Exercício não encontrado.");
        int alterados = jdbc.update("update exerciciotreino set videourl = ? where lower(nome) = lower(?) and (videourl is null or id = ?)", url, nome, exercicioId);
        if (alterados == 0) throw new TreinoInvalidoException("Exercício não encontrado.");
        return jdbc.queryForObject("select id, data, titulo from treino where id = ?", (rs, row) -> montar(rs), treinoId);
    }

    private Treino montar(ResultSet rs) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        List<Treino.Exercicio> exercicios = jdbc.query("select id, nome, series, repeticoes, observacao, pausasegundos, carga, seriesconcluidas, videourl from exerciciotreino where treinoid = ? order by ordem", (item, row) -> {
            UUID exercicioId = item.getObject("id", UUID.class);
            List<Treino.SerieConcluida> registradas = jdbc.query("select numero, carga, dataconclusao from serietreino where exercicioid = ? order by numero", (serie, indice) ->
                    new Treino.SerieConcluida(serie.getInt("numero"), serie.getBigDecimal("carga"), serie.getObject("dataconclusao", OffsetDateTime.class)), exercicioId);
            return new Treino.Exercicio(exercicioId, item.getString("nome"), item.getString("series"), item.getString("repeticoes"), item.getString("observacao"), item.getInt("pausasegundos"), item.getBigDecimal("carga"), item.getInt("seriesconcluidas"), item.getString("videourl"), registradas);
        }, id);
        return new Treino(id, rs.getObject("data", LocalDate.class), rs.getString("titulo"), exercicios);
    }

    private void validar(Treino treino) {
        if (treino.data() == null || treino.titulo() == null || treino.titulo().isBlank() || treino.titulo().length() > 160) throw new TreinoInvalidoException("Treino precisa de data e título válidos.");
        if (treino.exercicios() == null || treino.exercicios().isEmpty() || treino.exercicios().size() > 40) throw new TreinoInvalidoException("Treino precisa de 1 a 40 exercícios.");
        for (Treino.Exercicio exercicio : treino.exercicios()) {
            if (exercicio.nome() == null || exercicio.nome().isBlank() || exercicio.nome().length() > 160) throw new TreinoInvalidoException("Nome de exercício inválido.");
            if (tamanho(exercicio.series()) > 80 || tamanho(exercicio.repeticoes()) > 80 || tamanho(exercicio.observacao()) > 300) throw new TreinoInvalidoException("Dados do exercício excedem o limite.");
            if (exercicio.pausasegundos() != null && (exercicio.pausasegundos() < 0 || exercicio.pausasegundos() > 600)) throw new TreinoInvalidoException("Intervalo de repouso inválido.");
        }
    }
    private int tamanho(String texto) { return texto == null ? 0 : texto.length(); }
}
