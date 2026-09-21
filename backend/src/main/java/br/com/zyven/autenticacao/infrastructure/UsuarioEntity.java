package br.com.zyven.autenticacao.infrastructure;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuario")
public class UsuarioEntity {

    @Id
    private UUID id;
    private String login;
    private String senhahash;
    private boolean ativo;
    private Instant datacadastro;

    protected UsuarioEntity() {
    }

    public String getLogin() {
        return login;
    }

    public String getSenhahash() {
        return senhahash;
    }

    public boolean isAtivo() {
        return ativo;
    }
}
