package br.com.zyven.financeiro;

import br.com.zyven.financeiro.domain.CategoriaFinanceira;
import br.com.zyven.financeiro.domain.TransacaoOfx;
import br.com.zyven.financeiro.infrastructure.FinanceiroStore;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class FinanceiroStoreTest {
    @Autowired private FinanceiroStore financeiro;

    @Test
    void reutilizaCategoriaConfirmadaParaMesmoEstabelecimentoComNumeroVariavel() {
        String referencia = UUID.randomUUID().toString();
        var primeira = financeiro.salvarImportacao("primeiro.ofx", referencia + "-1", List.of(
                new TransacaoOfx(referencia, "1", LocalDate.now(), new BigDecimal("-29.90"), "Mercado Exemplo 1 123456")));
        financeiro.confirmar(primeira.pendentes().getFirst().lancamentoid(), CategoriaFinanceira.ALIMENTACAO);

        var segunda = financeiro.salvarImportacao("segundo.ofx", referencia + "-2", List.of(
                new TransacaoOfx(referencia, "2", LocalDate.now(), new BigDecimal("-19.90"), "Mercado Exemplo 2 654321")));

        assertThat(segunda.pendentes()).isEmpty();
        var lancamento = financeiro.importacoes().stream()
                .filter(item -> item.id().equals(segunda.importacaoid()))
                .findFirst().orElseThrow().lancamentos().getFirst();
        assertThat(lancamento.categoria()).isEqualTo(CategoriaFinanceira.ALIMENTACAO);
        assertThat(lancamento.origemcategoria()).isEqualTo("REGRA");
        assertThat(lancamento.status()).isEqualTo("LANCADO");
    }

    @Test
    void aplicaRegraPorTermoNosLancamentosAtuaisEFuturos() {
        String referencia = UUID.randomUUID().toString();
        String termo = "UBERTESTE" + referencia.substring(0, 8).toUpperCase();
        var primeira = financeiro.salvarImportacao("primeiro.ofx", referencia + "-a", List.of(
                new TransacaoOfx(referencia, "a", LocalDate.now(), new BigDecimal("-12.00"), termo + " VIAGEM 101")));

        var resultado = financeiro.aplicarRegraEmLote(termo, "Uber", CategoriaFinanceira.TRANSPORTE);
        assertThat(resultado.afetados()).isEqualTo(1);
        var atual = financeiro.importacoes().stream().filter(item -> item.id().equals(primeira.importacaoid())).findFirst().orElseThrow().lancamentos().getFirst();
        assertThat(atual.descricao()).isEqualTo("Uber");
        assertThat(atual.categoria()).isEqualTo(CategoriaFinanceira.TRANSPORTE);

        var segunda = financeiro.salvarImportacao("segundo.ofx", referencia + "-b", List.of(
                new TransacaoOfx(referencia, "b", LocalDate.now(), new BigDecimal("-18.00"), termo + " VIAGEM 202")));
        assertThat(segunda.pendentes()).isEmpty();
        var futuro = financeiro.importacoes().stream().filter(item -> item.id().equals(segunda.importacaoid())).findFirst().orElseThrow().lancamentos().getFirst();
        assertThat(futuro.descricao()).isEqualTo("Uber");
        assertThat(futuro.categoria()).isEqualTo(CategoriaFinanceira.TRANSPORTE);
    }

    @Test
    void lembraDescricaoEditadaManualmentenoProximoExtrato() {
        String referencia = UUID.randomUUID().toString();
        String estabelecimento = "LOCALTESTE" + referencia.substring(0, 8).toUpperCase();
        var primeira = financeiro.salvarImportacao("primeiro.ofx", referencia + "-c", List.of(
                new TransacaoOfx(referencia, "c", LocalDate.now(), new BigDecimal("-5.00"), estabelecimento + " 123")));
        financeiro.renomear(primeira.pendentes().getFirst().lancamentoid(), "Nome preferido");

        var segunda = financeiro.salvarImportacao("segundo.ofx", referencia + "-d", List.of(
                new TransacaoOfx(referencia, "d", LocalDate.now(), new BigDecimal("-7.00"), estabelecimento + " 456")));
        var futuro = financeiro.importacoes().stream().filter(item -> item.id().equals(segunda.importacaoid())).findFirst().orElseThrow().lancamentos().getFirst();
        assertThat(futuro.descricao()).isEqualTo("Nome preferido");
        assertThat(futuro.categoria()).isNull();
    }
}
