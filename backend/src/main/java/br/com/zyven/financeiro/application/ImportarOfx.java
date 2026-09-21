package br.com.zyven.financeiro.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import br.com.zyven.financeiro.infrastructure.FinanceiroStore;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImportarOfx {
    private final LeitorOfx leitor;
    private final FinanceiroStore financeiro;
    private final SugerirCategoriasFinanceiras sugestoes;
    public ImportarOfx(LeitorOfx leitor, FinanceiroStore financeiro, SugerirCategoriasFinanceiras sugestoes) { this.leitor = leitor; this.financeiro = financeiro; this.sugestoes = sugestoes; }
    public FinanceiroStore.ResultadoImportacao executar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) throw new IllegalArgumentException("Selecione um arquivo OFX");
        if (arquivo.getSize() > 5_000_000) throw new IllegalArgumentException("O arquivo OFX deve ter no máximo 5 MB");
        try {
            byte[] conteudo = arquivo.getBytes();
            var transacoes = leitor.ler(conteudo);
            if (transacoes.isEmpty()) throw new IllegalArgumentException("Nenhuma transação válida foi encontrada no OFX");
            var resultado = financeiro.salvarImportacao(nomeSeguro(arquivo.getOriginalFilename()), hash(conteudo), transacoes);
            financeiro.salvarSugestoes(sugestoes.executar(resultado.pendentes()));
            return resultado;
        } catch (java.io.IOException exception) { throw new IllegalArgumentException("Não foi possível receber o arquivo OFX"); }
    }
    private String nomeSeguro(String nome) { String valor = nome == null ? "extrato.ofx" : nome.replaceAll("[\\p{Cntrl}/\\\\]", "_"); return valor.substring(0, Math.min(valor.length(), 255)); }
    private String hash(byte[] conteudo) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(conteudo)); } catch (NoSuchAlgorithmException exception) { throw new IllegalStateException("SHA-256 indisponível", exception); } }
}
