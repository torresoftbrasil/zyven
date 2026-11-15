package br.com.zyven.notificacao.infrastructure;

import br.com.zyven.notificacao.application.RedigirNotificacao;
import br.com.zyven.notificacao.domain.SugestaoNotificacao;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class NotificacaoStore {
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private final JdbcTemplate jdbc;
    private final RedigirNotificacao redator;
    public NotificacaoStore(JdbcTemplate jdbc, RedigirNotificacao redator) { this.jdbc = jdbc; this.redator = redator; }

    public record Preferencias(BigDecimal metadiaria, int aguaalvodiaria, int aguahoje) { }

    @Transactional(readOnly = true)
    public Preferencias preferencias() {
        return jdbc.queryForObject("select metadiaria, aguaalvodiaria from preferencianotificacao where id = 1", (rs, row) ->
            new Preferencias(rs.getBigDecimal("metadiaria"), rs.getInt("aguaalvodiaria"), aguaHoje()));
    }

    @Transactional
    public Preferencias definirMeta(BigDecimal meta) {
        if (meta != null && (meta.signum() <= 0 || meta.compareTo(new BigDecimal("1000000")) > 0)) throw new IllegalArgumentException("A meta diária deve ser positiva e de até R$ 1.000.000.");
        jdbc.update("update preferencianotificacao set metadiaria = ? where id = 1", meta);
        return preferencias();
    }

    @Transactional
    public Preferencias beberAgua(int quantidade) {
        if (quantidade < 50 || quantidade > 2000) throw new IllegalArgumentException("Registre entre 50 e 2000 ml por vez.");
        jdbc.update("insert into hidratacao (id, quantidade, instante) values (?, ?, now())", UUID.randomUUID(), quantidade);
        jdbc.update("update notificacao set estado = 'CONCLUIDA', dataatualizacao = now() where tipo = 'AGUA' and estado = 'PENDENTE' and chave like ?", "agua-" + LocalDate.now(FUSO) + "%");
        return preferencias();
    }

    @Transactional
    public List<SugestaoNotificacao> avaliar() {
        LocalDate hoje = LocalDate.now(FUSO);
        Preferencias preferencia = preferencias();
        if (preferencia.metadiaria() != null) {
            BigDecimal gasto = jdbc.queryForObject("select coalesce(sum(-valor), 0) from lancamentofinanceiro where datalancamento = ? and valor < 0 and status = 'LANCADO'", BigDecimal.class, hoje);
            if (gasto != null && gasto.compareTo(preferencia.metadiaria()) > 0) {
                int excesso = gasto.subtract(preferencia.metadiaria()).multiply(new BigDecimal("100")).divide(preferencia.metadiaria(), 0, java.math.RoundingMode.HALF_UP).intValue();
                criar("orcamento-" + hoje, "ORCAMENTO", "Ritmo do dia", "O gasto de hoje passou " + excesso + "% da meta definida.", "O gasto de hoje passou um pouco da meta. Quer dar uma olhada com calma?");
            }
        }
        Integer treinos = jdbc.queryForObject("select count(*) from treino where data = ?", Integer.class, hoje);
        if (treinos != null && treinos > 0) criar("treino-" + hoje, "TREINO", "Treino de hoje", "Há um treino programado para hoje.", "Seu treino de hoje está pronto na Academia. Quer conferir antes de começar?");
        int hora = LocalTime.now(FUSO).getHour();
        int janela = hora < 10 ? 0 : hora < 14 ? 10 : hora < 18 ? 14 : hora < 22 ? 18 : 0;
        if (janela > 0 && preferencia.aguahoje() < preferencia.aguaalvodiaria()) {
            criar("agua-" + hoje + "-" + janela, "AGUA", "Pausa para água", "Ainda não foi atingida a meta de água de hoje.", "Uma pausa para água pode cair bem. Quer registrar um copo?");
        }
        return listar();
    }

    @Transactional(readOnly = true)
    public List<SugestaoNotificacao> listar() {
        return jdbc.query("select id, tipo, titulo, mensagem, estado from notificacao where datacadastro >= now() - interval '7 days' order by datacadastro desc limit 30", (rs, row) ->
            new SugestaoNotificacao(rs.getObject("id", UUID.class), rs.getString("tipo"), rs.getString("titulo"), rs.getString("mensagem"), rs.getString("estado")));
    }

    @Transactional
    public void descartar(UUID id) { jdbc.update("update notificacao set estado = 'DESCARTADA', dataatualizacao = now() where id = ? and estado = 'PENDENTE'", id); }

    private int aguaHoje() {
        Integer total = jdbc.queryForObject("select coalesce(sum(quantidade), 0) from hidratacao where (instante at time zone 'America/Sao_Paulo')::date = ?", Integer.class, LocalDate.now(FUSO));
        return total == null ? 0 : total;
    }
    private void criar(String chave, String tipo, String titulo, String fato, String alternativa) {
        Integer existente = jdbc.queryForObject("select count(*) from notificacao where chave = ?", Integer.class, chave);
        if (existente != null && existente > 0) return;
        String mensagem = redator.redigir(tipo, fato, alternativa);
        jdbc.update("insert into notificacao (id, chave, tipo, titulo, mensagem, estado, datacadastro, dataatualizacao) values (?, ?, ?, ?, ?, 'PENDENTE', now(), now()) on conflict (chave) do nothing", UUID.randomUUID(), chave, tipo, titulo, mensagem);
    }
}
