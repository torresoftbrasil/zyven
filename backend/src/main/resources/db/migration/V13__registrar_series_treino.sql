create table serietreino (
    id uuid primary key,
    exercicioid uuid not null references exerciciotreino(id) on delete cascade,
    numero integer not null,
    carga numeric(7,2),
    dataconclusao timestamptz not null,
    constraint ckserienumero check (numero between 1 and 30),
    constraint ckseriecarga check (carga is null or carga between 0 and 2000),
    constraint uqserietreino unique (exercicioid, numero)
);
create index ixserieexercicio on serietreino(exercicioid);
