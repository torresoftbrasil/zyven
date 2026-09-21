create table usuario (
    id uuid primary key,
    login varchar(120) not null unique,
    senhahash varchar(100) not null,
    ativo boolean not null default true,
    datacadastro timestamptz not null
);

insert into usuario (id, login, senhahash, ativo, datacadastro)
values ('7b7d64d5-d1c6-4b9a-a5e5-b4c30f2d98ec', 'arthur', '$2a$12$e3NvOzHpQbGBLJCWIooswu7HUoDiT/ldXWmfFbG62QvkGuqqD3AEC', true, current_timestamp);
