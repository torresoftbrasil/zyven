package br.com.zyven.academia.domain;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record Treino(UUID id, LocalDate data, String titulo, List<Exercicio> exercicios) {
    public record Exercicio(UUID id, String nome, String series, String repeticoes, String observacao,
            Integer pausasegundos, BigDecimal carga, Integer seriesconcluidas, String videourl, List<SerieConcluida> seriesregistradas) {
        public Exercicio(String nome, String series, String repeticoes, String observacao) {
            this(null, nome, series, repeticoes, observacao, 60, null, 0, null, List.of());
        }
        public Exercicio(UUID id, String nome, String series, String repeticoes, String observacao,
                int pausasegundos, BigDecimal carga, int seriesconcluidas, String videourl) {
            this(id, nome, series, repeticoes, observacao, pausasegundos, carga, seriesconcluidas, videourl, List.of());
        }
    }
    public record SerieConcluida(int numero, BigDecimal carga, OffsetDateTime dataconclusao) { }
}
