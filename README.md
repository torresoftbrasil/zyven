# Zyven

Assistente pessoal com frontend Angular, API Spring Boot e PostgreSQL.

## Estrutura

- `frontend/`: Angular 22
- `backend/`: Java 25 e Spring Boot 4
- `prototype/`: referência visual aprovada

## Banco local

PostgreSQL em `localhost:5432`, banco `zyven`, usuário `zyven`, senha `zyven`.

## Execução

Backend:

```bash
cd backend
export GEMINI_API_KEY="sua-chave"
mvn spring-boot:run
```

Frontend:

```bash
cd frontend
npm start
```

Migrações pelo IntelliJ: execute `br.com.zyven.MigrationApplication`.
