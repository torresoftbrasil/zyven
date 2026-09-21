# Zyven - Engineering Guide

## Product Vision

Zyven is a voice-first personal assistant. The product must feel sophisticated,
precise, calm, private, and technologically advanced. The approved prototype in
`prototype/` is the visual source of truth for every screen built from now on.

## Technology Baseline

- Java 25 LTS
- Spring Boot 4
- Angular 22 with standalone components and strict TypeScript
- Node.js 24 LTS
- PostgreSQL 18
- Maven 3.9+
- Flyway for every database schema change

Do not downgrade this baseline without documenting a concrete compatibility
reason. Prefer stable releases and latest patches; never use preview dependencies
in production code without explicit approval.

## Repository Layout

- `frontend/`: Angular application
- `backend/`: Spring Boot API and database migrations
- `prototype/`: approved dependency-free visual prototype
- `USO_IA.md`: catálogo vivo dos modelos de IA, limites e integrações do produto

## IA e Modelos

Antes de propor, implementar ou alterar uma integração de IA, leia
`USO_IA.md`. Ele é a fonte do repositório para modelos disponíveis, limites e
usos aprovados, planejados ou em experimentação.

- Escolha o modelo pelo caso de uso e pela cota ativa, não somente pelo nome ou
  pela versão mais recente.
- Nunca exponha chaves, tokens, dados pessoais ou conteúdo sensível em prompts,
  logs, testes, documentação ou no frontend.
- Mantenha credenciais exclusivamente em configuração segura do ambiente; não
  faça commit de segredos.
- Antes de colocar uma integração em produção, registre-a em `USO_IA.md` com
  modelo exato, objetivo, dados enviados, responsável, limites e decisão de
  privacidade/custo pendente ou concluída.
- Ao descobrir alteração de cota ou disponibilidade no painel do provedor,
  atualize a tabela e a data do catálogo no mesmo change set.
- Trate modelos preview como experimentais: isole-os atrás de uma interface de
  integração e não os torne dependência essencial sem aprovação explícita.

## Visual Standard

Every screen must preserve the approved Zyven language:

- Deep navy and graphite surfaces, cold white text, cyan lighting.
- Magenta only for exceptional status or a restrained secondary accent.
- Sparse composition, technical microcopy, thin borders, ambient blue light.
- The voice waveform remains the persistent core interaction where appropriate.
- Modules open with the established beam, scan, expansion, and staggered reveal.
- Module pages use a consistent workspace: title, sub-tabs, summary metrics,
  dashboard content, recent activity, contextual add button, and modal forms.
- Modals close by explicit action, outside click, and Escape.
- Mobile uses bottom sheets, touch targets of at least 44px, safe-area support,
  keyboard-safe forms, and horizontal navigation where necessary.
- Support keyboard navigation, semantic markup, visible focus, strong contrast,
  and `prefers-reduced-motion` from the beginning.
- Do not introduce generic Bootstrap/Material styling that conflicts with Zyven.

## Architecture

Use pragmatic Clean Architecture boundaries by business feature. Avoid a global
folder containing every controller, service, or repository. A backend feature
normally contains:

```text
feature/
  api/             controllers and request/response DTOs
  application/     use cases and orchestration services
  domain/          entities, value objects, rules and repository interfaces
  infrastructure/  JPA repositories, integrations and persistence adapters
```

Use object orientation, encapsulation, polymorphism, composition, and inheritance
when they model a real domain relationship. Do not create artificial inheritance
or abstractions only to satisfy a pattern.

Frontend code follows feature boundaries as well. Keep page orchestration,
reusable UI, data-access, and domain models separate. Use signals for local state,
typed reactive forms, lazy routes, OnPush-compatible patterns, and DTOs at API
boundaries. Mock data remains in typed data-access services until its backend
endpoint is implemented.

## Clean Code Rules

- Classes and methods have one clear responsibility.
- Prefer immutable DTOs and Java records for transport data.
- Never expose JPA entities directly through REST.
- Validate requests at the API boundary and domain invariants in the domain.
- Controllers translate HTTP; application services execute use cases.
- Domain code must not depend on Spring, HTTP, JPA, or JSON concerns.
- Use constructor injection. Do not use field injection.
- Avoid static mutable state, magic values, boolean parameter traps, and broad
  utility classes.
- Exceptions must be meaningful and translated consistently by a global handler.
- Add tests in proportion to risk: domain unit tests, application tests, repository
  integration tests, API tests, and focused frontend component/service tests.
- Code identifiers are in Portuguese for domain concepts and English only for
  framework or universally technical concepts. Comments explain why, not what.

## Naming Standard

Domain concepts use Portuguese consistently across database, Java, TypeScript,
routes, screens, and labels.

- PostgreSQL table and column names are lowercase Portuguese, simple, and contain
  no underscores: `despesaitem`, `datacadastro`, `categoriaid`.
- Java classes use singular PascalCase matching the domain: `DespesaItem`.
- Collection or list screen names may use plural: `DespesaItens`.
- DTO suffixes are explicit: `DespesaItemRequest`, `DespesaItemResponse`.
- REST resources are lowercase Portuguese: `/api/despesaitens`.
- Foreign keys end in `id` without an underscore: `despesaid`.
- Constraints and indexes may use compact Portuguese names without underscores.

Do not abbreviate business names unless the abbreviation is part of the domain.
Database names must remain readable despite the no-underscore convention.

## Database Evolution

Flyway is the only mechanism allowed to change schema. Hibernate uses
`ddl-auto=validate` and must never create or mutate production tables.

- Migrations live in `backend/src/main/resources/db/migration`.
- Once applied, a migration is immutable. Never edit or delete its history.
- Every schema change receives the next version: `V2__criar_despesaitem.sql`.
- Migrations must be deterministic, transactional where PostgreSQL allows it,
  and include constraints and indexes required by the use case.
- `MigrationApplication` is the dedicated IntelliJ run target for applying pending
  migrations locally without starting the web server.

Local development credentials are intentionally insecure for now:

```text
database: zyven
username: zyven
password: zyven
host: localhost
port: 5432
```

Authentication is intentionally out of scope until explicitly introduced.

## Delivery Workflow

For each requested feature:

1. Clarify the domain behavior from existing code and the request.
2. Create the next Flyway migration when persistence changes.
3. Implement domain, application, infrastructure, DTO, and API layers.
4. Replace only the relevant frontend mocks with typed API access.
5. Preserve the approved visual and animation system.
6. Run backend and frontend tests and builds.

Keep unrelated refactors out of feature changes. Update this guide when an
architectural or visual decision becomes a permanent project standard.
