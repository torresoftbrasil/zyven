package br.com.zyven.autenticacao.infrastructure;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UsuarioDetalhesService implements UserDetailsService {

    private final UsuarioJpaRepository usuarios;

    public UsuarioDetalhesService(UsuarioJpaRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    public UserDetails loadUserByUsername(String login) {
        UsuarioEntity usuario = usuarios.findByLoginAndAtivoTrue(login)
                .orElseThrow(() -> new UsernameNotFoundException("Credenciais inválidas."));
        return User.withUsername(usuario.getLogin()).password(usuario.getSenhahash()).authorities("USUARIO").build();
    }
}
