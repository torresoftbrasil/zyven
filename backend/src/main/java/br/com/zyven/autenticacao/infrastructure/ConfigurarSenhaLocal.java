package br.com.zyven.autenticacao.infrastructure;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!migration")
public class ConfigurarSenhaLocal {
    @Bean
    ApplicationRunner configurarSenhaArthur(UsuarioJpaRepository usuarios,
            @Value("${zyven.usuario.senhahash:}") String senhaHash) {
        return args -> {
            if (senhaHash.isBlank()) return;
            if (!senhaHash.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$")) {
                throw new IllegalStateException("Hash de senha configurado é inválido");
            }
            UsuarioEntity usuario = usuarios.findByLoginAndAtivoTrue("arthur")
                    .orElseThrow(() -> new IllegalStateException("Usuário arthur não encontrado"));
            if (!senhaHash.equals(usuario.getSenhahash())) {
                usuario.atualizarSenhaHash(senhaHash);
                usuarios.save(usuario);
            }
        };
    }
}
