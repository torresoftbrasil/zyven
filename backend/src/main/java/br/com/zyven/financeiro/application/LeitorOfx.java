package br.com.zyven.financeiro.application;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import br.com.zyven.financeiro.domain.TransacaoOfx;
import org.springframework.stereotype.Component;

@Component
public class LeitorOfx {
    private static final Pattern BLOCO_TRANSACAO = Pattern.compile("<STMTTRN>(.*?)(?:</STMTTRN>|(?=<STMTTRN>|</BANKTRANLIST>))", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern CONTA = Pattern.compile("<ACCTID>([^<\\r\\n]+)", Pattern.CASE_INSENSITIVE);

    public List<TransacaoOfx> ler(byte[] conteudo) {
        String texto = decodificar(conteudo);
        String conta = valor(texto, CONTA);
        if (conta == null || conta.isBlank()) conta = "CONTA_NAO_IDENTIFICADA";
        List<TransacaoOfx> transacoes = new ArrayList<>();
        Matcher blocos = BLOCO_TRANSACAO.matcher(texto);
        while (blocos.find()) {
            String bloco = blocos.group(1);
            String identificador = campo(bloco, "FITID");
            String data = campo(bloco, "DTPOSTED");
            String valor = campo(bloco, "TRNAMT");
            if (identificador == null || data == null || valor == null) continue;
            String descricao = primeiroNaoVazio(campo(bloco, "MEMO"), campo(bloco, "NAME"), "Lançamento sem descrição");
            try {
                transacoes.add(new TransacaoOfx(conta.trim(), identificador.trim(), LocalDate.parse(data.substring(0, 8), DateTimeFormatter.BASIC_ISO_DATE), new BigDecimal(valor.trim()), descricao));
            } catch (RuntimeException ignored) {
                // Uma transação inválida não compromete as demais do extrato.
            }
        }
        return transacoes;
    }

    private String decodificar(byte[] conteudo) {
        try {
            String inicio = new String(conteudo, 0, Math.min(conteudo.length, 1024), StandardCharsets.ISO_8859_1).toUpperCase(Locale.ROOT);
            return new String(conteudo, inicio.contains("ENCODING:USASCII") || inicio.contains("CHARSET:1252") ? StandardCharsets.ISO_8859_1 : StandardCharsets.UTF_8);
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Não foi possível ler o arquivo OFX");
        }
    }

    private String campo(String texto, String nome) { return valor(texto, Pattern.compile("<" + nome + ">([^<\\r\\n]+)", Pattern.CASE_INSENSITIVE)); }
    private String valor(String texto, Pattern pattern) { Matcher matcher = pattern.matcher(texto); return matcher.find() ? matcher.group(1).trim() : null; }
    private String primeiroNaoVazio(String... valores) { for (String item : valores) if (item != null && !item.isBlank()) return item; return "Lançamento sem descrição"; }
}
