"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell, BriefcaseBusiness, CalendarDays, ChevronDown, CirclePlus,
  Clock3, Command, Grid2X2, LayoutDashboard, Loader2, MoreHorizontal,
  Search, Settings2, Sparkles, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Workspace = { id: string; name: string; icon: string | null };
type Board = { id: string; workspace_id: string; name: string };
type List = { id: string; board_id: string; name: string; position: number };
type DbCard = {
  id: string; board_id: string; list_id: string; title: string;
  description: string | null; position: number; created_at: string;
  due_date: string | null; is_archived: boolean; completed_at: string | null;
};
type Column = List & { cards: DbCard[] };

const workspaceStyle: Record<string, { initials: string; tone: string }> = {
  "WAWO Hub": { initials: "WH", tone: "sand" },
  "WAWO Brand House": { initials: "WB", tone: "red" },
  NFEC: { initials: "NF", tone: "navy" },
  LDMA: { initials: "LD", tone: "blue" },
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "DM";
}

function metaFor(card: DbCard) {
  if (card.due_date) return `Due ${new Intl.DateTimeFormat("en-NG", { month: "short", day: "numeric" }).format(new Date(card.due_date))}`;
  if (card.completed_at) return "Completed";
  return "Active";
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [userName, setUserName] = useState("Daniel Malik");
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadWorkspace(workspace: Workspace) {
    setLoading(true);
    setError("");
    setActiveWorkspace(workspace);

    const { data: boards, error: boardError } = await supabase
      .from("boards").select("id,workspace_id,name").eq("workspace_id", workspace.id)
      .is("archived_at", null).order("created_at", { ascending: true }).limit(1);
    if (boardError) { setError(boardError.message); setLoading(false); return; }

    const nextBoard = boards?.[0] ?? null;
    setBoard(nextBoard);
    if (!nextBoard) { setColumns([]); setLoading(false); return; }

    const { data: lists, error: listError } = await supabase
      .from("lists").select("id,board_id,name,position").eq("board_id", nextBoard.id)
      .is("archived_at", null).order("position", { ascending: true });
    if (listError) { setError(listError.message); setLoading(false); return; }

    const { data: cards, error: cardError } = await supabase
      .from("cards").select("id,board_id,list_id,title,description,position,created_at,due_date,is_archived,completed_at")
      .eq("board_id", nextBoard.id).eq("is_archived", false).order("position", { ascending: true });
    if (cardError) { setError(cardError.message); setLoading(false); return; }

    setColumns((lists ?? []).map(list => ({ ...list, cards: (cards ?? []).filter(card => card.list_id === list.id) })));
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (profile?.full_name) setUserName(profile.full_name);
      else if (user.email) setUserName(user.email.split("@")[0]);

      const { data: orgs, error: orgError } = await supabase.from("organizations").select("id").eq("slug", "exito").limit(1);
      if (orgError || !orgs?.[0]) { setError(orgError?.message ?? "Exito organization not found."); setLoading(false); return; }

      const { data: ws, error: wsError } = await supabase
        .from("workspaces").select("id,name,icon").eq("organization_id", orgs[0].id).order("created_at", { ascending: true });
      if (wsError) { setError(wsError.message); setLoading(false); return; }

      if (!active) return;
      setWorkspaces(ws ?? []);
      if (ws?.[0]) await loadWorkspace(ws[0]);
    })();
    return () => { active = false; };
  }, [supabase]);

  async function createBoard() {
    if (!activeWorkspace || !userId) return;
    const name = window.prompt("Name your first board");
    if (!name?.trim()) return;
    setSaving(true); setError("");
    const { data, error: boardError } = await supabase.from("boards").insert({
      workspace_id: activeWorkspace.id,
      name: name.trim(),
      created_by: userId,
    }).select("id,workspace_id,name").single();
    if (boardError) setError(boardError.message);
    else {
      setBoard(data);
      await loadWorkspace(activeWorkspace);
    }
    setSaving(false);
  }

  async function addCard(columnId: string) {
    if (!board) return;
    const title = window.prompt("What should we work on?");
    if (!title?.trim()) return;
    setSaving(true); setError("");

    const column = columns.find(c => c.id === columnId);
    const position = column ? Math.max(0, ...column.cards.map(c => Number(c.position))) + 1000 : 1000;
    const { error: insertError } = await supabase.from("cards").insert({
      board_id: board.id, list_id: columnId, title: title.trim(), position,
    });
    if (insertError) setError(insertError.message);
    else await loadWorkspace(activeWorkspace!);
    setSaving(false);
  }

  const filteredColumns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;
    return columns.map(column => ({
      ...column,
      cards: column.cards.filter(card => [card.title, card.description ?? "", metaFor(card)].some(v => v.toLowerCase().includes(q))),
    }));
  }, [columns, query]);

  const totalCards = columns.reduce((sum, column) => sum + column.cards.length, 0);
  const completed = columns.find(c => c.name.toLowerCase() === "completed")?.cards.length ?? 0;
  const todo = columns.filter(c => !["completed"].includes(c.name.toLowerCase())).reduce((sum,c) => sum+c.cards.length,0);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">e</div><div><div className="brand-name">exito</div><div className="brand-caption">work operating system</div></div></div>
        <div className="workspace-picker">
          <div className="workspace-avatar">{activeWorkspace ? (workspaceStyle[activeWorkspace.name]?.initials ?? initials(activeWorkspace.name)) : "EX"}</div>
          <div className="workspace-copy"><span className="eyebrow">Workspace</span><strong>{activeWorkspace?.name ?? "Loading..."}</strong></div><ChevronDown size={16}/>
        </div>

        <nav className="nav">
          {[
            [LayoutDashboard, "Overview"],
            [BriefcaseBusiness, "My Work"],
            [Grid2X2, "Boards"],
            [CalendarDays, "Calendar"],
            [Users, "Team"],
          ].map(([Icon, label]) => (
            <button className={activeNav === label ? "nav-item active" : "nav-item"} key={label} onClick={() => setActiveNav(label)}>
              <Icon size={18}/><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-section">
          <div className="section-heading"><span>YOUR BUSINESSES</span><CirclePlus size={15}/></div>
          {workspaces.map(workspace => {
            const style=workspaceStyle[workspace.name] ?? {initials:initials(workspace.name),tone:"navy"};
            return <button key={workspace.id} className={activeWorkspace?.id===workspace.id?"business active":"business"} onClick={()=>loadWorkspace(workspace)}>
              <span className={"mini-avatar "+style.tone}>{style.initials}</span><span>{workspace.name}</span>
            </button>;
          })}
        </div>

        <div className="sidebar-bottom">
          <button className="nav-item"><Settings2 size={18}/><span>Settings</span></button>
          <div className="user-chip"><div className="user-avatar">{initials(userName)}</div><div><strong>{userName}</strong><span>Owner</span></div><MoreHorizontal size={17}/></div>
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="breadcrumbs"><span>Exito</span><span>/</span><strong>{activeWorkspace?.name ?? "Workspace"}</strong></div>
          <div className="top-actions">
            <label className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search work..."/><kbd><Command size={12}/> K</kbd></label>
            <button className="icon-button"><Bell size={18}/></button><div className="top-avatar">{initials(userName)}</div>
          </div>
        </header>

        <div className="content">
          <div className="hero-row"><div><span className="eyebrow">Good morning, {userName.split(" ")[0]}</span><h1>{activeNav==="Overview" ? "Your business at a glance." : activeNav}</h1><p>One place to see what is moving, what needs attention, and what comes next.</p></div>
            {board && <button className="primary-button" onClick={()=>addCard(columns[0]?.id)} disabled={saving}><CirclePlus size={17}/> {saving?"Saving...":"New work"}</button>}
          </div>

          <div className="metrics">
            <div className="metric"><span>Active work</span><strong>{todo}</strong><small>{activeWorkspace?.name ?? "workspace"}</small></div>
            <div className="metric"><span>Board cards</span><strong>{totalCards}</strong><small>{board?.name ?? "No active board"}</small></div>
            <div className="metric"><span>Completed</span><strong>{completed}</strong><small>on this board</small></div>
            <div className="metric"><span>Workspaces</span><strong>{workspaces.length}</strong><small>inside Exito</small></div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="section-title">
            <div><span className="eyebrow">Active board</span><h2>{board?.name ?? "No board yet"}</h2></div>
            <div className="view-actions"><button className="view-button active"><Grid2X2 size={15}/> Board</button><button className="view-button"><CalendarDays size={15}/> Calendar</button><button className="view-button"><Clock3 size={15}/> Timeline</button><button className="icon-button"><MoreHorizontal size={18}/></button></div>
          </div>

          {loading ? <div className="loading-state"><Loader2 className="spin" size={22}/><span>Loading Exito...</span></div> :
            !board ? <div className="empty-state"><Grid2X2 size={26}/><strong>No board yet</strong><p>This workspace is ready for its first board.</p><button className="primary-button" onClick={createBoard} disabled={saving}><CirclePlus size={16}/> {saving?"Creating...":"Create board"}</button></div> :
            <div className="board">{filteredColumns.map(column => (
              <div className="column" key={column.id}>
                <div className="column-header"><div><span className="column-dot"></span><strong>{column.name}</strong><span className="count">{column.cards.length}</span></div><button className="column-more"><MoreHorizontal size={17}/></button></div>
                <div className="card-stack">
                  {column.cards.map(card => <article className="task-card" key={card.id}>
                    <div className="card-top"><div className="labels"><span className="label">{board.name}</span></div><button className="card-more"><MoreHorizontal size={15}/></button></div>
                    <h3>{card.title}</h3><div className="card-footer"><span className="card-meta">{metaFor(card)}</span><span className="assignee">{initials(userName)}</span></div>
                  </article>)}
                  <button className="add-card" onClick={()=>addCard(column.id)} disabled={saving}><CirclePlus size={15}/> {saving?"Saving...":"Add work"}</button>
                </div>
              </div>
            ))}</div>
          }

          <div className="ai-strip"><div className="ai-icon"><Sparkles size={18}/></div><div><strong>Exito AI is coming to the board.</strong><p>Ask what needs attention, create work from a conversation, or let Exito prepare your next action plan.</p></div><button className="secondary-button">Explore AI</button></div>
        </div>
      </section>
    </main>
  );
}
