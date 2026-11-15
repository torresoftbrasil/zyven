package br.com.zyven.academia.api;

import br.com.zyven.academia.application.LerTreinosDeFotos;
import br.com.zyven.academia.domain.Treino;
import br.com.zyven.academia.infrastructure.AcademiaStore;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/academia")
public class AcademiaController {
    private final AcademiaStore treinos;
    private final LerTreinosDeFotos leitor;
    public AcademiaController(AcademiaStore treinos, LerTreinosDeFotos leitor) { this.treinos = treinos; this.leitor = leitor; }

    @GetMapping("/treinos")
    List<Treino> listar() { return treinos.listar(); }
    @PostMapping(value = "/treinos/fotos/previa", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    List<Treino> previa(@RequestParam("fotos") List<MultipartFile> fotos) throws Exception { return leitor.executar(fotos); }
    @PostMapping("/treinos/fotos/confirmar")
    List<Treino> confirmar(@RequestBody List<Treino> previa) { return treinos.importar(previa); }
    @PatchMapping("/treinos/{id}/data")
    Treino mover(@PathVariable UUID id, @RequestBody MoverTreinoRequest request) { return treinos.mover(id, request.data()); }
    record MoverTreinoRequest(LocalDate data) { }
}
