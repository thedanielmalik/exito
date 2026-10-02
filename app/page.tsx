"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, CirclePlus,
  Clock3, Command, Grid2X2, LayoutDashboard, Loader2, MessageCircle,
  MoreHorizontal, Search, Settings2, Sparkles, Trash2, Users, X,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Workspace = { id: string; name: string; icon: string | null };
type Board = { id: string; workspace_id: string; name: string };
type List = { id: string; board_id: string; name: string; position: number };
type DbCard = {
  id: string; board_id: string; list_id: string; title: string;
  description: string | null; position: number; created_at: string;
  due_date: string | null; is_archived: boolean; completed_at: string | null;
};
type Column = List & { cards: DbCard[] };
type Member = { user_id: string; name: string };
type Comment = { id: string; user_id: string | null; body: string; created_at: string };
type Checklist = { id: string; card_id: string; name: string };
type ChecklistItem = { id: string; checklist_id: string; name: string; is_completed: boolean };
type Activity = { id: string; user_id: string | null; action_type: string; metadata: Record<string, unknown>; created_at: string };

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

function prettyAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [userName, setUserName] = useState("Daniel Malik");
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedCard, setSelectedCard] = useState<DbCard | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [commentText, setCommentText] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newChecklistName, setNewChecklistName] = useState("");
  const [dragCardId, setDragCardId] = useState<string | null>(null);

  async function loadBoard(nextBoard: Board, workspace: Workspace) {
    setBoard(nextBoard);
    setLoading(true);
    setError("");
    const { data: lists, error: listError } = await supabase
      .from("lists").select("id,board_id,name,position").eq("board_id", nextBoard.id)
      .is("archived_at", null).order("position", { ascending: true });
    if (listError) { setError(listError.message); setLoading(false); return; }

    const { data: cards, error: cardError } = await supabase
      .from("cards").select("id,board_id,list_id,title,description,position,created_at,due_date,is_archived,completed_at")
      .eq("board_id", nextBoard.id).eq("is_archived", false).order("position", { ascending: true });
    if (cardError) { setError(cardError.message); setLoading(false); return; }

    setColumns((lists ?? []).map(list => ({ ...list, cards: (cards ?? []).filter(card => card.list_id === list.id) })));

    const { data: wm } = await supabase.from("workspace_members").select("user_id").eq("workspace_id", workspace.id);
    const ids = (wm ?? []).map(x => x.user_id);
    if (ids.length) {
      const { data: profiles } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      setMembers(ids.map(id => ({ user_id: id, name: profiles?.find(p => p.id === id)?.full_name || (id === userId ? userName : "Team member") })));
    } else setMembers([]);
    setLoading(false);
  }

  async function loadWorkspace(workspace: Workspace) {
    setLoading(true);
    setError("");
    setActiveWorkspace(workspace);
    setSelectedCard(null);

    const { data: boardRows, error: boardError } = await supabase
      .from("boards").select("id,workspace_id,name").eq("workspace_id", workspace.id)
      .is("archived_at", null).order("created_at", { ascending: true });
    if (boardError) { setError(boardError.message); setLoading(false); return; }

    const nextBoards = boardRows ?? [];
    setBoards(nextBoards);
    if (!nextBoards.length) { setBoard(null); setColumns([]); setLoading(false); return; }

    const current = board && nextBoards.some(b => b.id === board.id) ? board : nextBoards[0];
    await loadBoard(current, workspace);
  }
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      const name = profile?.full_name || user.email?.split("@")[0] || "Daniel Malik";
      setUserName(name);

      const { data: orgs, error: orgError } = await supabase.from("organizations").select("id").eq("slug", "exito").limit(1);
      if (orgError || !orgs?.[0]) { setError(orgError?.message ?? "Exito organization not found."); setLoading(false); return; }
      setOrgId(orgs[0].id);

      const { data: ws, error: wsError } = await supabase
        .from("workspaces").select("id,name,icon").eq("organization_id", orgs[0].id).order("created_at", { ascending: true });
      if (wsError) { setError(wsError.message); setLoading(false); return; }
      if (!active) return;
      setWorkspaces(ws ?? []);
      if (ws?.[0]) await loadWorkspace(ws[0]);
    })();
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    if (!board?.id) return;
    const channel = supabase.channel(`board-${board.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cards", filter: `board_id=eq.${board.id}` }, () => activeWorkspace && loadWorkspace(activeWorkspace))
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => selectedCard && loadCardDetails(selectedCard))
      .on("postgres_changes", { event: "*", schema: "public", table: "checklists" }, () => selectedCard && loadCardDetails(selectedCard))
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_items" }, () => selectedCard && loadCardDetails(selectedCard))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [board?.id, activeWorkspace?.id, selectedCard?.id, supabase]);

  async function logActivity(card: DbCard, action: string, metadata: Record<string, unknown> = {}) {
    if (!orgId || !userId) return;
    await supabase.from("activities").insert({
      organization_id: orgId, board_id: card.board_id, card_id: card.id,
      user_id: userId, action_type: action, metadata,
    });
  }

  async function loadCardDetails(card: DbCard) {
    const [commentRes, checklistRes, memberRes, activityRes] = await Promise.all([
      supabase.from("comments").select("id,user_id,body,created_at").eq("card_id", card.id).order("created_at", { ascending: true }),
      supabase.from("checklists").select("id,card_id,name").eq("card_id", card.id).order("created_at", { ascending: true }),
      supabase.from("card_members").select("user_id").eq("card_id", card.id),
      supabase.from("activities").select("id,user_id,action_type,metadata,created_at").eq("card_id", card.id).order("created_at", { ascending: false }).limit(30),
    ]);
    const checklistIds = (checklistRes.data ?? []).map(x => x.id);
    const itemRes = checklistIds.length
      ? await supabase.from("checklist_items").select("id,checklist_id,name,is_completed").in("checklist_id", checklistIds)
      : { data: [], error: null };
    setComments(commentRes.data ?? []);
    setChecklists(checklistRes.data ?? []);
    setChecklistItems(itemRes.data ?? []);
    setAssignedIds((memberRes.data ?? []).map(x => x.user_id));
    setActivities(activityRes.data ?? []);
  }

  async function openCard(card: DbCard) {
    setSelectedCard(card);
    await loadCardDetails(card);
  }

  async function updateCard(patch: Partial<DbCard>, action: string, metadata: Record<string, unknown> = {}) {
    if (!selectedCard) return;
    setSaving(true); setError("");
    const { data, error: updateError } = await supabase.from("cards").update(patch).eq("id", selectedCard.id)
      .select("id,board_id,list_id,title,description,position,created_at,due_date,is_archived,completed_at").single();
    if (updateError) setError(updateError.message);
    else {
      setSelectedCard(data);
      await logActivity(data, action, metadata);
      await loadWorkspace(activeWorkspace!);
    }
    setSaving(false);
  }

  async function createBoard() {
    if (!activeWorkspace || !userId) return;
    const name = window.prompt("Name your board");
    if (!name?.trim()) return;
    setSaving(true); setError("");
    const { data, error: boardError } = await supabase.from("boards").insert({
      workspace_id: activeWorkspace.id, name: name.trim(), created_by: userId,
    }).select("id,workspace_id,name").single();
    if (boardError) setError(boardError.message);
    else if (data) { setBoards(prev => [...prev, data]); await loadBoard(data, activeWorkspace); }
    setSaving(false);
  }

  async function addCard(columnId: string) {
    if (!board || !userId) return;
    const title = window.prompt("What should we work on?");
    if (!title?.trim()) return;
    setSaving(true); setError("");
    const column = columns.find(c => c.id === columnId);
    const position = column ? Math.max(0, ...column.cards.map(c => Number(c.position))) + 1000 : 1000;
    const { data, error: insertError } = await supabase.from("cards").insert({
      board_id: board.id, list_id: columnId, title: title.trim(), position, created_by: userId,
    }).select("id,board_id,list_id,title,description,position,created_at,due_date,is_archived,completed_at").single();
    if (insertError) setError(insertError.message);
    else if (data) await logActivity(data, "card_created");
    if (!insertError) await loadWorkspace(activeWorkspace!);
    setSaving(false);
  }

  async function addList() {
    if (!board) return;
    const name = window.prompt("Name this list");
    if (!name?.trim()) return;
    const position = Math.max(0, ...columns.map(c => Number(c.position))) + 1000;
    const { error: e } = await supabase.from("lists").insert({ board_id: board.id, name: name.trim(), position });
    if (e) setError(e.message); else await loadWorkspace(activeWorkspace!);
  }

  async function renameList(column: Column) {
    const name = window.prompt("Rename list", column.name);
    if (!name?.trim() || name.trim() === column.name) return;
    const { error: e } = await supabase.from("lists").update({ name: name.trim() }).eq("id", column.id);
    if (e) setError(e.message); else await loadWorkspace(activeWorkspace!);
  }

  async function moveCard(cardId: string, targetList: Column) {
    const card = columns.flatMap(c => c.cards).find(c => c.id === cardId);
    if (!card || card.list_id === targetList.id) return;
    const position = Math.max(0, ...targetList.cards.map(c => Number(c.position))) + 1000;
    const completedAt = targetList.name.toLowerCase() === "completed" ? new Date().toISOString() : null;
    const { data, error: e } = await supabase.from("cards").update({ list_id: targetList.id, position, completed_at: completedAt })
      .eq("id", cardId).select("id,board_id,list_id,title,description,position,created_at,due_date,is_archived,completed_at").single();
    if (e) setError(e.message);
    else if (data) { setSelectedCard(selectedCard?.id === data.id ? data : selectedCard); await logActivity(data, "card_moved", { to_list: targetList.name }); await loadWorkspace(activeWorkspace!); }
    setDragCardId(null);
  }

  async function saveComment() {
    if (!selectedCard || !userId || !commentText.trim()) return;
    setSaving(true);
    const { error: e } = await supabase.from("comments").insert({ card_id: selectedCard.id, user_id: userId, body: commentText.trim() });
    if (e) setError(e.message); else { setCommentText(""); await logActivity(selectedCard, "comment_added"); await loadCardDetails(selectedCard); }
    setSaving(false);
  }

  async function createChecklist() {
    if (!selectedCard || !newChecklistName.trim()) return;
    const { data, error: e } = await supabase.from("checklists").insert({ card_id: selectedCard.id, name: newChecklistName.trim() }).select("id,card_id,name").single();
    if (e) setError(e.message); else if (data) { setNewChecklistName(""); await logActivity(selectedCard, "checklist_created", { name: data.name }); await loadCardDetails(selectedCard); }
  }

  async function addChecklistItem(checklistId: string) {
    if (!selectedCard || !newChecklistItem.trim()) return;
    const { error: e } = await supabase.from("checklist_items").insert({ checklist_id: checklistId, name: newChecklistItem.trim() });
    if (e) setError(e.message); else { setNewChecklistItem(""); await loadCardDetails(selectedCard); }
  }

  async function toggleChecklistItem(item: ChecklistItem) {
    if (!selectedCard) return;
    const { error: e } = await supabase.from("checklist_items").update({ is_completed: !item.is_completed }).eq("id", item.id);
    if (e) setError(e.message); else await loadCardDetails(selectedCard);
  }

  async function toggleAssignment(memberId: string) {
    if (!selectedCard) return;
    if (assignedIds.includes(memberId)) {
      const { error: e } = await supabase.from("card_members").delete().eq("card_id", selectedCard.id).eq("user_id", memberId);
      if (e) setError(e.message); else { await logActivity(selectedCard, "member_unassigned", { user_id: memberId }); await loadCardDetails(selectedCard); }
    } else {
      const { error: e } = await supabase.from("card_members").insert({ card_id: selectedCard.id, user_id: memberId });
      if (e) setError(e.message); else { await logActivity(selectedCard, "member_assigned", { user_id: memberId }); await loadCardDetails(selectedCard); }
    }
  }

  const filteredColumns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;
    return columns.map(column => ({ ...column, cards: column.cards.filter(card =>
      [card.title, card.description ?? "", metaFor(card)].some(v => v.toLowerCase().includes(q))
    )}));
  }, [columns, query]);

  const totalCards = columns.reduce((sum, column) => sum + column.cards.length, 0);
  const completed = columns.find(c => c.name.toLowerCase() === "completed")?.cards.length ?? 0;
  const todo = columns.filter(c => c.name.toLowerCase() !== "completed").reduce((sum,c) => sum+c.cards.length,0);
  const navigationItems: Array<[LucideIcon, string]> = [
    [LayoutDashboard, "Overview"], [BriefcaseBusiness, "My Work"], [Grid2X2, "Boards"],
    [CalendarDays, "Calendar"], [Users, "Team"],
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">e</div><div><div className="brand-name">exito</div><div className="brand-caption">work operating system</div></div></div>
        <div className="workspace-picker">
          <div className="workspace-avatar">{activeWorkspace ? (workspaceStyle[activeWorkspace.name]?.initials ?? initials(activeWorkspace.name)) : "EX"}</div>
          <div className="workspace-copy"><span className="eyebrow">Workspace</span><strong>{activeWorkspace?.name ?? "Loading..."}</strong></div><ChevronDown size={16}/>
        </div>
        <nav className="nav">{navigationItems.map(([Icon, label]) => (
          <button className={activeNav === label ? "nav-item active" : "nav-item"} key={label} onClick={() => setActiveNav(label)}><Icon size={18}/><span>{label}</span></button>
        ))}</nav>
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
            {board && <div className="board-switcher">
              <select value={board.id} onChange={e => {
                const next = boards.find(b => b.id === e.target.value);
                if (next && activeWorkspace) void loadBoard(next, activeWorkspace);
              }}>
                {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button className="secondary-button" onClick={()=>void createBoard()}><CirclePlus size={15}/> New board</button>
            </div>}
            <div className="view-actions">
              <button className="view-button active"><Grid2X2 size={15}/> Board</button>
              <button className="view-button"><CalendarDays size={15}/> Calendar</button>
              <button className="view-button"><Clock3 size={15}/> Timeline</button>
              {board && <button className="view-button" onClick={addList}><CirclePlus size={15}/> List</button>}
            </div>
          </div>

          {loading ? <div className="loading-state"><Loader2 className="spin" size={22}/><span>Loading Exito...</span></div> :
            !board ? <div className="empty-state"><Grid2X2 size={26}/><strong>No board yet</strong><p>This workspace is ready for its first board.</p><button className="primary-button" onClick={createBoard} disabled={saving}><CirclePlus size={16}/> {saving?"Creating...":"Create board"}</button></div> :
            <div className="board">
              {filteredColumns.map(column => (
                <div className="column" key={column.id}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={()=>dragCardId && void moveCard(dragCardId,column)}>
                  <div className="column-header"><div><span className="column-dot"></span><strong>{column.name}</strong><span className="count">{column.cards.length}</span></div>
                    <button className="column-more" onClick={()=>renameList(column)} title="Rename list"><MoreHorizontal size={17}/></button>
                  </div>
                  <div className="card-stack">
                    {column.cards.map(card => <article className="task-card" key={card.id} draggable
                      onDragStart={()=>setDragCardId(card.id)} onClick={()=>void openCard(card)}>
                      <div className="card-top"><div className="labels"><span className="label">{board.name}</span></div><button className="card-more" onClick={e=>{e.stopPropagation();void openCard(card)}}><MoreHorizontal size={15}/></button></div>
                      <h3>{card.title}</h3><div className="card-footer"><span className="card-meta">{metaFor(card)}</span><span className="assignee">{initials(userName)}</span></div>
                    </article>)}
                    <button className="add-card" onClick={()=>addCard(column.id)} disabled={saving}><CirclePlus size={15}/> {saving?"Saving...":"Add work"}</button>
                  </div>
                </div>
              ))}
              <button className="add-list-column" onClick={addList}><CirclePlus size={17}/> Add another list</button>
            </div>
          }

          <div className="ai-strip"><div className="ai-icon"><Sparkles size={18}/></div><div><strong>Exito AI is coming to the board.</strong><p>Ask what needs attention, create work from a conversation, or let Exito prepare your next action plan.</p></div><button className="secondary-button">Explore AI</button></div>
        </div>
      </section>

      {selectedCard && <div className="drawer-backdrop" onClick={()=>setSelectedCard(null)}>
        <aside className="card-drawer" onClick={e=>e.stopPropagation()}>
          <header className="drawer-header"><div><span className="eyebrow">Card</span><h2>Work details</h2></div><button className="icon-button" onClick={()=>setSelectedCard(null)}><X size={18}/></button></header>
          <div className="drawer-body">
            <input className="drawer-title" value={selectedCard.title} onChange={e=>setSelectedCard({...selectedCard,title:e.target.value})}
              onBlur={()=>void updateCard({title:selectedCard.title},"card_title_updated")} />
            <div className="drawer-field"><label>Description</label><textarea value={selectedCard.description ?? ""} placeholder="Add a description..." onChange={e=>setSelectedCard({...selectedCard,description:e.target.value})}
              onBlur={()=>void updateCard({description:selectedCard.description},"description_updated")}/></div>
            <div className="drawer-grid">
              <div className="drawer-field"><label>List</label><select value={selectedCard.list_id} onChange={e=>{const target=columns.find(c=>c.id===e.target.value);if(target)void moveCard(selectedCard.id,target)}}>{columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="drawer-field"><label>Due date</label><input type="date" value={selectedCard.due_date ? selectedCard.due_date.slice(0,10) : ""} onChange={e=>void updateCard({due_date:e.target.value ? new Date(e.target.value+"T23:59:00").toISOString() : null},"due_date_updated")}/></div>
            </div>

            <div className="drawer-section"><div className="drawer-section-head"><h3>People</h3><Users size={15}/></div>
              <div className="member-list">{members.map(m=><label className="member-row" key={m.user_id}><input type="checkbox" checked={assignedIds.includes(m.user_id)} onChange={()=>void toggleAssignment(m.user_id)}/><span className="assignee">{initials(m.name)}</span><span>{m.name}</span></label>)}</div>
            </div>

            <div className="drawer-section"><div className="drawer-section-head"><h3>Checklist</h3><Check size={15}/></div>
              {checklists.map(cl=><div className="checklist" key={cl.id}><strong>{cl.name}</strong>
                {(checklistItems.filter(i=>i.checklist_id===cl.id)).map(item=><label className="check-row" key={item.id}><input type="checkbox" checked={item.is_completed} onChange={()=>void toggleChecklistItem(item)}/><span className={item.is_completed?"checked-text":""}>{item.name}</span></label>)}
                <div className="inline-add"><input value={newChecklistItem} onChange={e=>setNewChecklistItem(e.target.value)} placeholder="Add checklist item"/><button onClick={()=>void addChecklistItem(cl.id)}><CirclePlus size={15}/></button></div>
              </div>)}
              <div className="inline-add"><input value={newChecklistName} onChange={e=>setNewChecklistName(e.target.value)} placeholder="New checklist"/><button onClick={()=>void createChecklist()}><CirclePlus size={15}/></button></div>
            </div>

            <div className="drawer-section"><div className="drawer-section-head"><h3>Comments</h3><MessageCircle size={15}/></div>
              <div className="comments">{comments.map(c=><div className="comment" key={c.id}><div className="comment-avatar">{initials(c.user_id===userId?userName:"Team member")}</div><div><strong>{c.user_id===userId?userName:"Team member"}</strong><p>{c.body}</p><small>{new Date(c.created_at).toLocaleString("en-NG")}</small></div></div>)}</div>
              <div className="comment-box"><textarea value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Write a comment..."/><button className="primary-button" onClick={()=>void saveComment()} disabled={saving}>Comment</button></div>
            </div>

            <div className="drawer-section"><div className="drawer-section-head"><h3>Activity</h3><Clock3 size={15}/></div>
              <div className="activity-list">{activities.map(a=><div className="activity-row" key={a.id}><span className="activity-dot"></span><div><strong>{a.user_id===userId?userName:"Team member"}</strong> {prettyAction(a.action_type).toLowerCase()}<small>{new Date(a.created_at).toLocaleString("en-NG")}</small></div></div>)}</div>
            </div>
          </div>
        </aside>
      </div>}
    </main>
  );
}
