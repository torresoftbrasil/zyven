package br.com.zyven.notificacao.domain;

import java.util.UUID;

public record SugestaoNotificacao(UUID id, String tipo, String titulo, String mensagem, String estado) { }
