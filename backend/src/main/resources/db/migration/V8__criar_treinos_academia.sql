create table treino (
    id uuid primary key,
    data date not null,
    titulo varchar(160) not null,
    origem varchar(20) not null,
    datacadastro timestamptz not null,
    dataatualizacao timestamptz not null,
    constraint cktreinoorigem check (origem in ('MANUAL', 'FOTO'))
);
create index ixtreinodata on treino(data);

create table exerciciotreino (
    id uuid primary key,
    treinoid uuid not null references treino(id) on delete cascade,
    ordem integer not null,
    nome varchar(160) not null,
    series varchar(80),
    repeticoes varchar(80),
    observacao varchar(300),
    constraint ckexerciciotreinoordem check (ordem > 0),
    constraint uqexerciciotreinoordem unique (treinoid, ordem)
);
