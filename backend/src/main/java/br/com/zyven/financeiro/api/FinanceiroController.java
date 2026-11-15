package br.com.zyven.financeiro.api;

import java.util.UUID;
import java.util.List;

import br.com.zyven.financeiro.application.ImportarOfx;
import br.com.zyven.financeiro.domain.CategoriaFinanceira;
import br.com.zyven.financeiro.infrastructure.FinanceiroStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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

    @PostMapping(value = "/importacoes/ofx/previa", consumes = "multipart/form-data")
    ImportarOfx.PreviaOfx previa(@RequestParam("arquivo") MultipartFile arquivo) { return importarOfx.previsualizar(arquivo); }

    @GetMapping("/resumo") FinanceiroStore.Resumo resumo() { return financeiro.resumo(); }

    @GetMapping("/importacoes") List<FinanceiroStore.Importacao> importacoes(@RequestParam(required = false) String termo) { return financeiro.importacoes(termo); }

    @GetMapping("/lancamentos/consulta")
    FinanceiroStore.ConsultaLancamentos consultarLancamentos(@RequestParam(required = false) String termo,
                                                              @RequestParam(defaultValue = "0") int pagina) {
        return financeiro.consultarLancamentos(termo, pagina);
    }

    @PatchMapping("/lancamentos/revisao/descricao")
    FinanceiroStore.ResultadoRevisaoEmLote renomearPendentes(@Valid @RequestBody RenomeacaoTermoRequest request) {
        return financeiro.renomearPendentesPorTermo(request.termo(), request.descricao());
    }

    @PatchMapping("/lancamentos/revisao/categoria")
    FinanceiroStore.ResultadoRevisaoEmLote categorizarPendentes(@Valid @RequestBody CategoriaTermoRequest request) {
        return financeiro.categorizarPendentesPorTermo(request.termo(), request.categoria());
    }

    @PostMapping("/lancamentos/revisao/confirmacao")
    FinanceiroStore.ResultadoRevisaoEmLote confirmarPendentes(@Valid @RequestBody ConfirmacaoTermoRequest request) {
        return financeiro.confirmarPendentesPorTermo(request.termo(), request.categoria());
    }

    @PostMapping("/lancamentos/{id}/confirmacao")
    FinanceiroStore.Lancamento confirmar(@PathVariable UUID id, @Valid @RequestBody ConfirmacaoRequest request) { return financeiro.confirmar(id, request.categoria()); }

    @PatchMapping("/lancamentos/{id}/descricao")
    FinanceiroStore.Lancamento renomear(@PathVariable UUID id, @Valid @RequestBody DescricaoRequest request) { return financeiro.renomear(id, request.descricao()); }

    @PostMapping("/lancamentos/regras/termo")
    FinanceiroStore.ResultadoRegraEmLote regraEmLote(@Valid @RequestBody RegraTermoRequest request) {
        return financeiro.aplicarRegraEmLote(request.termo(), request.descricao(), request.categoria());
    }

    public record ConfirmacaoRequest(@NotNull CategoriaFinanceira categoria) { }
    public record DescricaoRequest(@NotBlank @Size(max = 255) String descricao) { }
    public record RegraTermoRequest(@NotBlank @Size(min = 3, max = 120) String termo,
                                   @NotBlank @Size(max = 255) String descricao,
                                   @NotNull CategoriaFinanceira categoria) { }
    public record RenomeacaoTermoRequest(@NotBlank @Size(min = 3, max = 120) String termo,
                                         @NotBlank @Size(max = 255) String descricao) { }
    public record CategoriaTermoRequest(@NotBlank @Size(min = 3, max = 120) String termo,
                                        @NotNull CategoriaFinanceira categoria) { }
    public record ConfirmacaoTermoRequest(@NotBlank @Size(min = 3, max = 120) String termo,
                                          CategoriaFinanceira categoria) { }
}
