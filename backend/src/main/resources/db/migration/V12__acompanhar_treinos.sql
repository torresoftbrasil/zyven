alter table treino drop constraint cktreinoorigem;
alter table treino add constraint cktreinoorigem check (origem in ('MANUAL', 'FOTO', 'TEXTO'));

alter table exerciciotreino add column pausasegundos integer not null default 60;
alter table exerciciotreino add column carga numeric(7,2);
alter table exerciciotreino add column seriesconcluidas integer not null default 0;
alter table exerciciotreino add column videourl varchar(300);
alter table exerciciotreino add constraint ckexerciciopausa check (pausasegundos between 0 and 600);
alter table exerciciotreino add constraint ckexerciciocarga check (carga is null or carga between 0 and 2000);
alter table exerciciotreino add constraint ckexercicioseriesconcluidas check (seriesconcluidas between 0 and 30);
