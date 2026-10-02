# Exito Build Specification — Internal Edition

## Positioning

Exito is the private operating system for the companies and ventures we run. It is not a public Trello clone for the first release.

## Tenancy

One organization can contain many workspaces. A workspace maps to a company, department, program, or operating unit.

Initial workspaces:
- WAWO Hub
- WAWO Brand House
- NFEC
- LDMA
- Future Ventures

## UX direction

The product should feel modern, premium, fast, and calm. Avoid copying Trello's branding or exact visual treatment. Use the familiar board/list/card interaction, but create an original Exito visual system.

Primary desktop navigation:
- Home
- My Work
- Workspaces
- Calendar
- Notifications
- Search

Each workspace can expose:
- Overview
- Boards
- Team
- Activity
- Settings

## First working experience

After sign-in:
1. User sees the Exito Home dashboard.
2. User can choose a workspace.
3. User can create a board.
4. Board opens with three starter lists: To Do, In Progress, Done.
5. User can create cards.
6. Cards can be dragged between lists.
7. Clicking a card opens its detail panel.
8. Card details support description, assignees, due date, labels, checklist, comments, and activity.
9. Changes persist to Supabase.
10. Board updates are realtime for connected team members.

## Internal-first behavior

Do not create public onboarding, public workspaces, public profiles, marketplace features, or billing screens in MVP.

Use realistic demo/seed workflows for the companies, but keep the data model generic.

## Later business templates

WAWO Hub production:
New Request -> Quote -> Payment -> Artwork -> Approved -> Production -> Quality Control -> Ready -> Delivered

WAWO Brand House:
Lead -> Brief -> Design -> Review -> Approved -> Production -> Delivery

NFEC:
Lead -> Contacted -> Proposal -> Negotiation -> Confirmed -> Completed

LDMA enrollment:
Lead -> Contacted -> Interested -> Payment Pending -> Registered -> Attended -> Follow-up

These are templates, not database enums.
