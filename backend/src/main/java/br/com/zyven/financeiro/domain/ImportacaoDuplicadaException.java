package br.com.zyven.financeiro.domain;

public class ImportacaoDuplicadaException extends RuntimeException {
    public ImportacaoDuplicadaException() {
        super("Este arquivo OFX já foi importado");
    }
}
