package br.com.zyven.financeiro.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransacaoOfx(String contareferencia, String identificador, LocalDate data, BigDecimal valor, String descricao) { }
