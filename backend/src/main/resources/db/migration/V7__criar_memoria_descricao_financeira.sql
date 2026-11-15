alter table lancamentofinanceiro add column descricaooriginal varchar(500);
update lancamentofinanceiro set descricaooriginal = descricao;
alter table lancamentofinanceiro alter column descricaooriginal set not null;

alter table regracategorizacaofinanceira add column termobusca varchar(120);
alter table regracategorizacaofinanceira add column descricaopadrao varchar(255);
alter table regracategorizacaofinanceira alter column categoria drop not null;
create unique index uqregrafianceiratermo on regracategorizacaofinanceira(termobusca) where termobusca is not null;
