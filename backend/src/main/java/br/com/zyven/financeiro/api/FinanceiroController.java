package br.com.zyven.financeiro.api;

import java.util.UUID;

import br.com.zyven.financeiro.application.ImportarOfx;
import br.com.zyven.financeiro.domain.CategoriaFinanceira;
import br.com.zyven.financeiro.infrastructure.FinanceiroStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/financeiro")
public class FinanceiroController {
    private final ImportarOfx importarOfx;
    private final FinanceiroStore financeiro;
    public FinanceiroController(ImportarOfx importarOfx, FinanceiroStore financeiro) { this.importarOfx = importarOfx; this.financeiro = financeiro; }

    @PostMapping(value = "/importacoes/ofx", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    FinanceiroStore.ResultadoImportacao importar(@RequestParam("arquivo") MultipartFile arquivo) { return importarOfx.executar(arquivo); }

    @GetMapping("/resumo") FinanceiroStore.Resumo resumo() { return financeiro.resumo(); }

    @PostMapping("/lancamentos/{id}/confirmacao")
    FinanceiroStore.Lancamento confirmar(@PathVariable UUID id, @Valid @RequestBody ConfirmacaoRequest request) { return financeiro.confirmar(id, request.categoria()); }

    public record ConfirmacaoRequest(@NotNull CategoriaFinanceira categoria) { }
}
