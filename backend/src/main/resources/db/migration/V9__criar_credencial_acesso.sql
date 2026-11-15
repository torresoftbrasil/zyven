create table entidadecredencial (
    id varchar(1000) primary key,
    nome varchar(100) not null,
    nomeexibicao varchar(200)
);
create table credencialacesso (
    id varchar(1000) primary key,
    entidadeid varchar(1000) not null references entidadecredencial(id),
    chavepublica bytea not null,
    contador bigint,
    verificacaoinicializada boolean,
    copiaelegivel boolean not null,
    transportes varchar(1000),
    tipocredencial varchar(100),
    estadocopia boolean not null,
    atestado bytea,
    dadoscliente bytea,
    datacriacao timestamp,
    ultimouso timestamp,
    rotulo varchar(1000) not null
);
create index ixcredencialentidade on credencialacesso(entidadeid);

-- A biblioteca Spring Security 7 usa nomes fixos em suas consultas JDBC.
-- Estas visões simples mantêm o armazenamento real sob nomes de domínio em português.
create view user_entities as select id, nome as name, nomeexibicao as display_name from entidadecredencial;
create view user_credentials as select
    id as credential_id, entidadeid as user_entity_user_id, chavepublica as public_key,
    contador as signature_count, verificacaoinicializada as uv_initialized,
    copiaelegivel as backup_eligible, transportes as authenticator_transports,
    tipocredencial as public_key_credential_type, estadocopia as backup_state,
    atestado as attestation_object, dadoscliente as attestation_client_data_json,
    datacriacao as created, ultimouso as last_used, rotulo as label
from credencialacesso;
