create table conversa (
    id uuid primary key,
    titulo varchar(160) not null,
    status varchar(24) not null,
    datacadastro timestamptz not null,
    dataatualizacao timestamptz not null,
    constraint ckconversastatus check (status in ('ATIVA', 'ENCERRADA'))
);

create table interacao (
    id uuid primary key,
    conversaid uuid not null references conversa(id),
    papel varchar(24) not null,
    origem varchar(24) not null,
    conteudo text not null,
    datacadastro timestamptz not null,
    constraint ckinteracaopapel check (papel in ('USUARIO', 'ASSISTENTE')),
    constraint ckinteracaoorigem check (origem in ('VOZ', 'TEXTO', 'SISTEMA'))
);

create index ixinteracaoconversa on interacao(conversaid, datacadastro desc);

create table grupotarefa (
    id uuid primary key,
    nome varchar(120) not null,
    descricao text,
    status varchar(24) not null,
    datainicio date,
    datafim date,
    datacadastro timestamptz not null,
    dataatualizacao timestamptz not null,
    constraint ckgrupotarefastatus check (status in ('ATIVO', 'ARQUIVADO')),
    constraint ckgrupotarefadata check (datafim is null or datainicio is null or datafim >= datainicio)
);

create table tarefa (
    id uuid primary key,
    grupoid uuid references grupotarefa(id),
    titulo varchar(180) not null,
    descricao text,
    classificacao varchar(32) not null,
    prioridade varchar(24) not null,
    status varchar(24) not null,
    dataplanejada date,
    datalimite date,
    dataconclusao date,
    origem varchar(24) not null,
    datacadastro timestamptz not null,
    dataatualizacao timestamptz not null,
    constraint cktarefaclassificacao check (classificacao in ('DOCUMENTACAO', 'RESERVA', 'FINANCEIRO', 'LOGISTICA', 'SAUDE', 'ROTEIRO', 'OUTRO')),
    constraint cktarefaprioridade check (prioridade in ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    constraint cktarefastatus check (status in ('SUGERIDA', 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA')),
    constraint cktarefaorigem check (origem in ('USUARIO', 'ASSISTENTE')),
    constraint cktarefadata check (datalimite is null or dataplanejada is null or datalimite >= dataplanejada)
);

create index ixtarefagrupo on tarefa(grupoid, status, datalimite);
create index ixtarefastatus on tarefa(status, datalimite);

create table memoria (
    id uuid primary key,
    chave varchar(120) not null,
    conteudo text not null,
    tipo varchar(24) not null,
    confianca numeric(4,3) not null,
    datavalidade timestamptz,
    datacadastro timestamptz not null,
    dataatualizacao timestamptz not null,
    constraint uqmemoriachave unique (chave),
    constraint ckmemoriatipo check (tipo in ('PREFERENCIA', 'FATO', 'DECISAO', 'CONTEXTO')),
    constraint ckmemoriaconfianca check (confianca >= 0 and confianca <= 1)
);

create table demandasugerida (
    id uuid primary key,
    interacaoid uuid not null references interacao(id),
    titulogrupo varchar(120),
    titulo varchar(180) not null,
    descricao text,
    classificacao varchar(32) not null,
    prioridade varchar(24) not null,
    dataplanejada date,
    datalimite date,
    confianca numeric(4,3) not null,
    status varchar(24) not null,
    datacadastro timestamptz not null,
    constraint ckdemandaclassificacao check (classificacao in ('DOCUMENTACAO', 'RESERVA', 'FINANCEIRO', 'LOGISTICA', 'SAUDE', 'ROTEIRO', 'OUTRO')),
    constraint ckemandaprioridade check (prioridade in ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    constraint ckdemandastatus check (status in ('PENDENTE', 'ACEITA', 'DESCARTADA')),
    constraint ckdemandaconfianca check (confianca >= 0 and confianca <= 1)
);
