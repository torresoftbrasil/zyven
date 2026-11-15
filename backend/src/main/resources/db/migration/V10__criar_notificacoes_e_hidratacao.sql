create table preferencianotificacao (
    id integer primary key,
    metadiaria numeric(12,2),
    aguaalvodiaria integer not null default 2000,
    constraint ckpreferencianotificacaoid check (id = 1),
    constraint ckpreferencianotificacaometa check (metadiaria is null or metadiaria > 0),
    constraint ckpreferencianotificacaoagua check (aguaalvodiaria between 500 and 8000)
);
insert into preferencianotificacao (id, metadiaria, aguaalvodiaria) values (1, null, 2000);
create table hidratacao (
    id uuid primary key,
    quantidade integer not null,
    instante timestamptz not null,
    constraint ckhidratacaoquantidade check (quantidade between 50 and 2000)
);
create index ixhidratacaoinstante on hidratacao(instante);
create table notificacao (
    id uuid primary key,
    chave varchar(100) not null unique,
    tipo varchar(24) not null,
    titulo varchar(120) not null,
    mensagem varchar(300) not null,
    estado varchar(16) not null,
    datacadastro timestamptz not null,
    dataatualizacao timestamptz not null,
    constraint cknotificacaotipo check (tipo in ('ORCAMENTO', 'TREINO', 'AGUA')),
    constraint cknotificacaoestado check (estado in ('PENDENTE', 'CONCLUIDA', 'DESCARTADA'))
);
create index ixnotificacaoestado on notificacao(estado, datacadastro desc);
