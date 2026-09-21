create table acontecimento (
    id uuid primary key,
    titulo varchar(180) not null,
    descricao text not null,
    tipo varchar(48) not null,
    importancia varchar(16) not null,
    dataocorrencia timestamptz not null,
    constraint ckacontecimentoimportancia check (importancia in ('BAIXA', 'NORMAL', 'ALTA', 'CRITICA'))
);

create index ixacontecimentodata on acontecimento(dataocorrencia desc);
