# Exito Product Blueprint

## Product purpose

Exito is a private-first business operating system for managing work across multiple companies and projects from one place.

Initial internal workspaces will include WAWO Hub, WAWO Brand House, NFEC, LDMA, and future ventures. These must remain configurable database records, not hard-coded enums.

## Core hierarchy

Organization
-> Workspace
-> Board
-> List
-> Card

A card can contain description, members, labels, start/due dates, checklists, comments, attachments, custom fields, and activity.

## MVP

Authentication, organization/workspaces, members, boards, lists, cards, drag and drop, card details, labels, assignees, due dates, checklists, comments, attachments, activity log, search, and notifications.

## Next phases

Phase 2: custom fields, templates, automation, calendar, table, dashboard, realtime collaboration.

Phase 3: AI assistant, AI board generation, AI task generation, AI summaries, natural-language actions, semantic search.

Phase 4: integrations, public API, webhooks, billing, enterprise controls.

## Product principles

1. One source of truth for work.
2. Fast visual interaction.
3. Realtime by default where practical.
4. Secure multi-tenant data isolation.
5. Business workflows must be configurable.
6. AI must operate through permission-checked tools.
7. Important mutations create auditable activity events.
8. Avoid feature sprawl until internal workflows prove the need.

## Initial navigation

Home, My Work, Workspaces, Boards, Calendar, Notifications, Search.

Global actions: Create, Search, AI assistant, Profile/Settings.

## Initial dashboard questions

- What needs my attention?
- What is overdue?
- What is due today?
- What is waiting on me?
- What projects are active?
- What changed recently?

## Planned data model

organizations
profiles
organization_members
workspaces
workspace_members
boards
lists
cards
card_members
labels
card_labels
checklists
checklist_items
comments
attachments
activities
notifications
custom_fields
card_custom_field_values
automations
automation_runs
events

Use foreign keys, indexes, and position/rank fields for reorderable entities.
