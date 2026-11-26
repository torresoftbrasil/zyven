package br.com.zyven.academia.api;

import br.com.zyven.academia.application.LerTreinosDeFotos;
import br.com.zyven.academia.application.LerPlanoDeTexto;
import br.com.zyven.academia.application.BuscarVideoExercicio;
import br.com.zyven.academia.domain.Treino;
import br.com.zyven.academia.infrastructure.AcademiaStore;
import java.time.LocalDate;
import java.math.BigDecimal;
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
    private final LerPlanoDeTexto leitorTexto;
    private final BuscarVideoExercicio buscadorVideo;
    public AcademiaController(AcademiaStore treinos, LerTreinosDeFotos leitor, LerPlanoDeTexto leitorTexto, BuscarVideoExercicio buscadorVideo) { this.treinos = treinos; this.leitor = leitor; this.leitorTexto = leitorTexto; this.buscadorVideo = buscadorVideo; }

    @GetMapping("/treinos")
    List<Treino> listar() { return treinos.listar(); }
    @PostMapping(value = "/treinos/fotos/previa", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    List<Treino> previa(@RequestParam("fotos") List<MultipartFile> fotos) throws Exception { return leitor.executar(fotos); }
    @PostMapping("/treinos/fotos/confirmar")
    List<Treino> confirmar(@RequestBody List<Treino> previa) { return treinos.importar(previa); }
    @PostMapping("/treinos/texto/previa")
    List<Treino> previaTexto(@RequestBody PlanoTextoRequest request) throws Exception { return leitorTexto.executar(request.texto()); }
    @PostMapping("/treinos/texto/confirmar")
    List<Treino> confirmarTexto(@RequestBody List<Treino> previa) { return treinos.importar(previa, "TEXTO"); }
    @PostMapping("/treinos/{treinoId}/exercicios/{exercicioId}/series")
    Treino concluirSerie(@PathVariable UUID treinoId, @PathVariable UUID exercicioId, @RequestBody SerieRequest request) { return treinos.registrarSerie(treinoId, exercicioId, request.carga()); }
    @PatchMapping("/treinos/{treinoId}/exercicios/{exercicioId}/video")
    Treino definirVideo(@PathVariable UUID treinoId, @PathVariable UUID exercicioId, @RequestBody VideoRequest request) { return treinos.definirVideo(treinoId, exercicioId, request.url()); }
    @PostMapping("/videos/busca")
    VideoRequest buscarVideo(@RequestBody BuscaVideoRequest request) throws Exception { return new VideoRequest(buscadorVideo.executar(request.nome())); }
    @PatchMapping("/treinos/{id}/data")
    Treino mover(@PathVariable UUID id, @RequestBody MoverTreinoRequest request) { return treinos.mover(id, request.data()); }
    record MoverTreinoRequest(LocalDate data) { }
    record PlanoTextoRequest(String texto) { }
    record SerieRequest(BigDecimal carga) { }
    record VideoRequest(String url) { }
    record BuscaVideoRequest(String nome) { }
}
