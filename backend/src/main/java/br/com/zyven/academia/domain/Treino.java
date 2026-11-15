package br.com.zyven.academia.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record Treino(UUID id, LocalDate data, String titulo, List<Exercicio> exercicios) {
    public record Exercicio(String nome, String series, String repeticoes, String observacao) { }
}
