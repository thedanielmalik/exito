"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CirclePlus,
  Clock3,
  Command,
  Grid2X2,
  LayoutDashboard,
  MoreHorizontal,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

type Card = {
  id: string;
  title: string;
  meta?: string;
  labels?: string[];
  assignee?: string;
};

type Column = {
  id: string;
  title: string;
  count: number;
  cards: Card[];
};

const workspaces = [
  { name: "WAWO Hub", initials: "WH", tone: "sand" },
  { name: "WAWO Brand House", initials: "WB", tone: "red" },
  { name: "NFEC", initials: "NF", tone: "navy" },
  { name: "LDMA", initials: "LD", tone: "blue" },
];

const initialColumns: Column[] = [
  {
    id: "todo",
    title: "To Do",
    count: 8,
    cards: [
      { id: "1", title: "Prepare Black Friday packaging campaign", meta: "Due today", labels: ["Campaign"], assignee: "DM" },
      { id: "2", title: "Review new WAWO Brand House enquiries", meta: "4 new leads", labels: ["Sales"], assignee: "AK" },
      { id: "3", title: "Finalize NFEC sponsor follow-up list", meta: "Due tomorrow", labels: ["NFEC"], assignee: "DM" },
    ],
  },
  {
    id: "progress",
    title: "In Progress",
    count: 5,
    cards: [
      { id: "4", title: "Build Exito operating workflow", meta: "Active now", labels: ["Product"], assignee: "DM" },
      { id: "5", title: "WAWO production artwork approvals", meta: "3 waiting", labels: ["Production"], assignee: "TO" },
      { id: "6", title: "NFEC 2026 operations checklist", meta: "This week", labels: ["Event"], assignee: "MO" },
    ],
  },
  {
    id: "review",
    title: "Review",
    count: 3,
    cards: [
      { id: "7", title: "Review LDMA training creative", meta: "Awaiting approval", labels: ["LDMA"], assignee: "DM" },
      { id: "8", title: "Approve WAWO client quotation", meta: "₦450,000", labels: ["Quote"], assignee: "DM" },
    ],
  },
  {
    id: "done",
    title: "Completed",
    count: 18,
    cards: [
      { id: "9", title: "Create Exito repository", meta: "Completed today", labels: ["Product"], assignee: "DM" },
      { id: "10", title: "Define initial Exito architecture", meta: "Completed today", labels: ["Product"], assignee: "DM" },
    ],
  },
];

export default function Home() {
  const [activeWorkspace, setActiveWorkspace] = useState(workspaces[0]);
  const [columns, setColumns] = useState(initialColumns);
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");

  const filteredColumns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;
    return columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) =>
        [card.title, card.meta, ...(card.labels ?? [])].some((value) =>
          value?.toLowerCase().includes(q),
        ),
      ),
    }));
  }, [columns, query]);

  function addCard(columnId: string) {
    const title = window.prompt("What should we work on?");
    if (!title?.trim()) return;
    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              count: column.count + 1,
              cards: [
                ...column.cards,
                {
                  id: crypto.randomUUID(),
                  title: title.trim(),
                  meta: "Just created",
                  labels: ["New"],
                  assignee: "DM",
                },
              ],
            }
          : column,
      ),
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">e</div>
          <div>
            <div className="brand-name">exito</div>
            <div className="brand-caption">work operating system</div>
          </div>
        </div>

        <div className="workspace-picker">
          <div className="workspace-avatar">{activeWorkspace.initials}</div>
          <div className="workspace-copy">
            <span className="eyebrow">Workspace</span>
            <strong>{activeWorkspace.name}</strong>
          </div>
          <ChevronDown size={16} />
        </div>

        <nav className="nav">
          {[
            [LayoutDashboard, "Overview"],
            [BriefcaseBusiness, "My Work"],
            [Grid2X2, "Boards"],
            [CalendarDays, "Calendar"],
            [Users, "Team"],
          ].map(([Icon, label]) => (
            <button
              className={activeNav === label ? "nav-item active" : "nav-item"}
              key={String(label)}
              onClick={() => setActiveNav(String(label))}
            >
              <Icon size={18} />
              <span>{String(label)}</span>
            </button>
          ))}
        </nav>

        <div className="side-section">
          <div className="section-heading">
            <span>YOUR BUSINESSES</span>
            <CirclePlus size={15} />
          </div>
          {workspaces.map((workspace) => (
            <button
              key={workspace.name}
              className={activeWorkspace.name === workspace.name ? "business active" : "business"}
              onClick={() => setActiveWorkspace(workspace)}
            >
              <span className={"mini-avatar " + workspace.tone}>{workspace.initials}</span>
              <span>{workspace.name}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button className="nav-item"><Settings2 size={18} /><span>Settings</span></button>
          <div className="user-chip">
            <div className="user-avatar">DM</div>
            <div>
              <strong>Daniel Malik</strong>
              <span>Owner</span>
            </div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Exito</span><span>/</span><strong>{activeWorkspace.name}</strong>
          </div>
          <div className="top-actions">
            <label className="search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search work..." />
              <kbd><Command size={12} /> K</kbd>
            </label>
            <button className="icon-button"><Bell size={18} /></button>
            <div className="top-avatar">DM</div>
          </div>
        </header>

        <div className="content">
          <div className="hero-row">
            <div>
              <span className="eyebrow">Good morning, Daniel</span>
              <h1>{activeNav === "Overview" ? "Your business at a glance." : activeNav}</h1>
              <p>One place to see what is moving, what needs attention, and what comes next.</p>
            </div>
            <button className="primary-button" onClick={() => addCard("todo")}>
              <CirclePlus size={17} /> New work
            </button>
          </div>

          <div className="metrics">
            <div className="metric"><span>Active work</span><strong>16</strong><small>across 4 businesses</small></div>
            <div className="metric"><span>Due today</span><strong>4</strong><small>2 need your attention</small></div>
            <div className="metric"><span>Overdue</span><strong>2</strong><small>both need follow-up</small></div>
            <div className="metric"><span>Completed</span><strong>18</strong><small>this month</small></div>
          </div>

          <div className="section-title">
            <div>
              <span className="eyebrow">Active board</span>
              <h2>Company Operations</h2>
            </div>
            <div className="view-actions">
              <button className="view-button active"><Grid2X2 size={15}/> Board</button>
              <button className="view-button"><CalendarDays size={15}/> Calendar</button>
              <button className="view-button"><Clock3 size={15}/> Timeline</button>
              <button className="icon-button"><MoreHorizontal size={18}/></button>
            </div>
          </div>

          <div className="board">
            {filteredColumns.map((column) => (
              <div className="column" key={column.id}>
                <div className="column-header">
                  <div><span className="column-dot"></span><strong>{column.title}</strong><span className="count">{column.count}</span></div>
                  <button className="column-more"><MoreHorizontal size={17}/></button>
                </div>

                <div className="card-stack">
                  {column.cards.map((card) => (
                    <article className="task-card" key={card.id}>
                      <div className="card-top">
                        <div className="labels">
                          {card.labels?.map((label) => <span className="label" key={label}>{label}</span>)}
                        </div>
                        <button className="card-more"><MoreHorizontal size={15}/></button>
                      </div>
                      <h3>{card.title}</h3>
                      <div className="card-footer">
                        <span className="card-meta">{card.meta}</span>
                        <span className="assignee">{card.assignee}</span>
                      </div>
                    </article>
                  ))}
                  <button className="add-card" onClick={() => addCard(column.id)}>
                    <CirclePlus size={15}/> Add work
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="ai-strip">
            <div className="ai-icon"><Sparkles size={18}/></div>
            <div>
              <strong>Exito AI is coming to the board.</strong>
              <p>Ask what needs attention, create work from a conversation, or let Exito prepare your next action plan.</p>
            </div>
            <button className="secondary-button">Explore AI</button>
          </div>
        </div>
      </section>
    </main>
  );
}
