# Exito Development Rules

## Source control

- GitHub is the source of truth.
- Prefer small, understandable commits.
- Never commit secrets.
- Use .env.local for secrets and keep .env.example as documentation.

## Data

- Database-first thinking for core entities.
- Use migrations for schema changes.
- Use foreign keys and indexes deliberately.
- Use Supabase Row Level Security for tenant isolation.

## UI

- Prioritize desktop workflow while remaining responsive.
- Board interactions should feel immediate.
- Prefer optimistic updates with rollback where safe.
- Keep card editing contextual so users do not lose board position.

## Architecture

- Separate domain logic from presentation.
- Do not hard-code companies or departments.
- Build reusable primitives for boards, lists, cards, members, labels, and activity.

## AI

- AI uses explicit permission-checked tools.
- Destructive operations support confirmation.
- AI mutations create normal activity events.
- Never expose unrestricted database access to the model.
