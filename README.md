# Exito

Exito is a private-first business operating system inspired by visual workflow tools such as Trello.

## Purpose

Exito is being built first for internal use across Daniel Malik's companies and projects, including WAWO Hub, WAWO Brand House, NFEC, LDMA, and future ventures.

## Product direction

Exito uses the core model:

Organization -> Workspace -> Board -> List -> Card

The long-term platform will add team collaboration, CRM and sales pipelines, production workflows, event operations, calendar/table/timeline views, automation, notifications, AI assistance, integrations, and analytics.

## Architecture

- Next.js
- TypeScript
- Tailwind CSS / shadcn/ui
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- Vercel
- GitHub

GitHub is the source of truth. Lovable is used for rapid UI/application iteration and Vercel is the production target.

See docs/product-blueprint.md and docs/development-rules.md.

## Deployment

### Supabase
Set:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Do not commit secrets. The service-role key is server-only and is not required by the current browser dashboard.

### Vercel
Connect the repository `thedanielmalik/exito` to a Vercel project and set the two public Supabase variables above for Production, Preview, and Development as appropriate. Then deploy the default branch.

The current Exito repository is intentionally deployment-ready and does not contain Vercel project IDs or credentials.

Deployment integration verified: the Exito Vercel project is connected to the GitHub repository, and the main branch is the production source.
