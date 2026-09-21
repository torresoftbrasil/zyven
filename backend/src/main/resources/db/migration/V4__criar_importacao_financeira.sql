create table importacaoofx (
    id uuid primary key,
    nomearquivo varchar(255) not null,
    hasharquivo varchar(64) not null,
    datacadastro timestamptz not null,
    constraint uqimportacaoofxhash unique (hasharquivo)
);

create table regracategorizacaofinanceira (
    id uuid primary key,
    chavecomparacao varchar(255) not null,
    categoria varchar(32) not null,
    datacadastro timestamptz not null,
    dataatualizacao timestamptz not null,
    constraint uqregrafianceirachave unique (chavecomparacao),
    constraint ckregrafianceiracategoria check (categoria in ('ALIMENTACAO', 'MORADIA', 'TRANSPORTE', 'SAUDE', 'LAZER', 'ASSINATURAS', 'EDUCACAO', 'COMPRAS', 'TARIFAS', 'TRANSFERENCIAS', 'RECEITAS', 'OUTROS'))
);

create table lancamentofinanceiro (
    id uuid primary key,
    importacaoid uuid not null references importacaoofx(id),
    contareferencia varchar(128) not null,
    identificadorofx varchar(255) not null,
    datalancamento date not null,
    valor numeric(16,2) not null,
    descricao varchar(500) not null,
    chavecomparacao varchar(255) not null,
    categoria varchar(32),
    origemcategoria varchar(24) not null,
    confianca numeric(4,3),
    status varchar(24) not null,
    datacadastro timestamptz not null,
    dataatualizacao timestamptz not null,
    constraint uqlancamentofinanceiroofx unique (contareferencia, identificadorofx),
    constraint cklancamentofinanceirocategoria check (categoria is null or categoria in ('ALIMENTACAO', 'MORADIA', 'TRANSPORTE', 'SAUDE', 'LAZER', 'ASSINATURAS', 'EDUCACAO', 'COMPRAS', 'TARIFAS', 'TRANSFERENCIAS', 'RECEITAS', 'OUTROS')),
    constraint cklancamentofinanceiroorigem check (origemcategoria in ('REGRA', 'IA', 'REVISAO')),
    constraint cklancamentofinanceirostatus check (status in ('LANCADO', 'PENDENTE_REVISAO')),
    constraint cklancamentofinanceiroconfianca check (confianca is null or (confianca >= 0 and confianca <= 1))
);

create index ixlancamentofinanceiroimportacao on lancamentofinanceiro(importacaoid);
create index ixlancamentofinanceirorevisao on lancamentofinanceiro(status, datalancamento desc);
