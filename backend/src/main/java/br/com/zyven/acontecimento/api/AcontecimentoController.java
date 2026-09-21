package br.com.zyven.acontecimento.api;

import java.util.List;

import br.com.zyven.acontecimento.domain.ImportanciaAcontecimento;
import br.com.zyven.acontecimento.infrastructure.AcontecimentoStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/acontecimentos")
public class AcontecimentoController {
    private final AcontecimentoStore acontecimentos;

    public AcontecimentoController(AcontecimentoStore acontecimentos) {
        this.acontecimentos = acontecimentos;
    }

    @GetMapping
    List<AcontecimentoStore.Acontecimento> recentes() {
        return acontecimentos.recentes();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AcontecimentoStore.Acontecimento registrar(@Valid @RequestBody AcontecimentoRequest request) {
        return acontecimentos.registrar(request.titulo().trim(), request.descricao().trim(), request.tipo().trim(), request.importancia());
    }

    public record AcontecimentoRequest(@NotBlank String titulo, @NotBlank String descricao, @NotBlank String tipo, @NotNull ImportanciaAcontecimento importancia) { }
}
