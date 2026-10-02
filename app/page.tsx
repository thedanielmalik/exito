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
type Board = { id: string; workspace_id: string; name: string; description?: string | null; background?: string | null; visibility?: string | null };
type List = { id: string; board_id: string; name: string; position: number };
type DbCard = {
  id: string; board_id: string; list_id: string; title: string;
  description: string | null; position: number; created_at: string;
  due_date: string | null; is_archived: boolean; completed_at: string | null;
};
type Column = List & { cards: DbCard[] };
type Member = { user_id: string; name: string; role?: string };
type Comment = { id: string; user_id: string | null; body: string; created_at: string };
type Checklist = { id: string; card_id: string; name: string };
type ChecklistItem = { id: string; checklist_id: string; name: string; is_completed: boolean };
type Activity = { id: string; user_id: string | null; action_type: string; metadata: Record<string, unknown>; created_at: string };
type Notification = { id: string; title: string; body: string | null; type: string; entity_type: string | null; entity_id: string | null; read_at: string | null; created_at: string };
type DashboardCard = DbCard & { board_name: string; workspace_name: string; list_name: string };
type DashboardMember = { user_id: string; name: string; active: number; overdue: number; completed: number };
type DashboardActivity = Activity & { user_name: string };
type Label = { id: string; board_id: string; name: string; color: string };
type CustomField = { id: string; board_id: string; name: string; field_type: "text"|"number"|"select"|"date"|"checkbox"; options: string[]; position: number };
type CustomFieldValue = { field_id: string; value: string | null };
type BoardTemplate = { id: string; name: string; description: string | null; icon: string | null; created_at: string };
type AutomationRule = { id: string; board_id: string; name: string; trigger_type: string; action_type: string; config: Record<string, unknown>; enabled: boolean };

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
  const [myWork, setMyWork] = useState<Array<DbCard & { board_name: string; workspace_name: string; list_name: string }>>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[]>([]);
  const [dashboardMembers, setDashboardMembers] = useState<DashboardMember[]>([]);
  const [dashboardActivities, setDashboardActivities] = useState<DashboardActivity[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [cardLabelIds, setCardLabelIds] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string,string>>({});
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [automationsLoading, setAutomationsLoading] = useState(false);
  const [boardView, setBoardView] = useState<"board"|"calendar"|"timeline">("board");

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
    const { data: memberRows } = await supabase.from("workspace_members").select("user_id,role").eq("workspace_id", workspace.id);
    if (memberRows?.length) setMembers(prev => prev.map(m => ({ ...m, role: memberRows.find(x => x.user_id === m.user_id)?.role ?? "member" })));
    } else setMembers([]);
    setLoading(false);
  }

  async function loadWorkspace(workspace: Workspace) {
    setLoading(true);
    setError("");
    setActiveWorkspace(workspace);
    setSelectedCard(null);

    const { data: boardRows, error: boardError } = await supabase
      .from("boards").select("id,workspace_id,name,description,background,visibility").eq("workspace_id", workspace.id)
      .is("archived_at", null).order("created_at", { ascending: true });
    if (boardError) { setError(boardError.message); setLoading(false); return; }

    const nextBoards = boardRows ?? [];
    setBoards(nextBoards);
    if (!nextBoards.length) { setBoard(null); setColumns([]); setLoading(false); return; }

    const current = board && nextBoards.some(b => b.id === board.id) ? board : nextBoards[0];
    await loadBoard(current, workspace);
  }
  async function loadExecutiveDashboard() {
    if (!orgId || !userId) return;
    setDashboardLoading(true);
    const { data: wsRows } = await supabase.from("workspaces").select("id,name").eq("organization_id", orgId).order("created_at", { ascending: true });
    const workspaceRows = wsRows ?? [];
    const workspaceIds = workspaceRows.map(w => w.id);
    if (!workspaceIds.length) { setDashboardCards([]); setDashboardMembers([]); setDashboardActivities([]); setDashboardLoading(false); return; }
    const { data: boardRows } = await supabase.from("boards").select("id,name,workspace_id").in("workspace_id", workspaceIds).is("archived_at", null);
    const boardsAll = boardRows ?? []; const boardIds = boardsAll.map(b => b.id);
    if (!boardIds.length) { setDashboardCards([]); setDashboardMembers([]); setDashboardActivities([]); setDashboardLoading(false); return; }
    const { data: cardRows } = await supabase.from("cards").select("id,board_id,list_id,title,description,position,created_at,due_date,is_archived,completed_at").in("board_id", boardIds).eq("is_archived", false).order("due_date", { ascending: true, nullsFirst: false });
    const { data: lists } = await supabase.from("lists").select("id,name").in("board_id", boardIds).is("archived_at", null);
    const ids = (cardRows ?? []).map(x => x.id);
    const [{ data: cardMembers }, { data: recentActivities }] = await Promise.all([
      ids.length ? supabase.from("card_members").select("card_id,user_id").in("card_id", ids) : Promise.resolve({ data: [] as Array<{card_id:string;user_id:string}> }),
      supabase.from("activities").select("id,user_id,action_type,metadata,created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(18),
    ]);
    const boardMap = new Map(boardsAll.map(b => [b.id, b])); const workspaceMap = new Map(workspaceRows.map(w => [w.id, w])); const listMap = new Map((lists ?? []).map(l => [l.id, l]));
    const mapped: DashboardCard[] = (cardRows ?? []).map(card => { const b = boardMap.get(card.board_id); const w = b ? workspaceMap.get(b.workspace_id) : undefined; return { ...card, board_name: b?.name ?? "Board", workspace_name: w?.name ?? "Workspace", list_name: listMap.get(card.list_id)?.name ?? "List" }; });
    setDashboardCards(mapped);
    const memberIds = [...new Set((cardMembers ?? []).map(m => m.user_id))]; const activityUserIds = [...new Set((recentActivities ?? []).map(a => a.user_id).filter(Boolean) as string[])];
    const profileIds = [...new Set([...memberIds, ...activityUserIds, userId])];
    const { data: profiles } = profileIds.length ? await supabase.from("profiles").select("id,full_name").in("id", profileIds) : { data: [] as Array<{id:string;full_name:string|null}> };
    const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name || "Team member"]));
    const memberCardMap = new Map<string, string[]>();
    (cardMembers ?? []).forEach(m => { const arr = memberCardMap.get(m.user_id) ?? []; arr.push(m.card_id); memberCardMap.set(m.user_id, arr); });
    setDashboardMembers(memberIds.map(id => { const assigned = (cardRows ?? []).filter(c => memberCardMap.get(id)?.includes(c.id)); return { user_id: id, name: profileMap.get(id) ?? "Team member", active: assigned.filter(c => !c.completed_at).length, overdue: assigned.filter(c => !c.completed_at && c.due_date && new Date(c.due_date).getTime() < Date.now()).length, completed: assigned.filter(c => !!c.completed_at).length }; }).sort((a,b) => b.active - a.active));
    setDashboardActivities((recentActivities ?? []).map(a => ({ ...a, user_name: a.user_id ? (profileMap.get(a.user_id) ?? "Team member") : "System" })));
    setDashboardLoading(false);
  }
  async function loadNotifications() {
    if (!userId) return;
    const { data, error: e } = await supabase.from("notifications")
      .select("id,title,body,type,entity_type,entity_id,read_at,created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    if (!e) setNotifications(data ?? []);
  }

  async function markNotificationRead(notification: Notification) {
    if (notification.read_at) return;
    const { error: e } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notification.id);
    if (!e) setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  async function loadMyWork() {
    if (!userId) return;
    const { data: memberships } = await supabase.from("card_members").select("card_id").eq("user_id", userId);
    const ids = (memberships ?? []).map(x => x.card_id);
    if (!ids.length) { setMyWork([]); return; }
    const { data: cards } = await supabase.from("cards")
      .select("id,board_id,list_id,title,description,position,created_at,due_date,is_archived,completed_at")
      .in("id", ids).eq("is_archived", false).order("due_date", { ascending: true, nullsFirst: false }).limit(100);
    const boardIds = [...new Set((cards ?? []).map(c => c.board_id))];
    const listIds = [...new Set((cards ?? []).map(c => c.list_id))];
    const [{ data: boardRows }, { data: listRows }] = await Promise.all([
      boardIds.length ? supabase.from("boards").select("id,name,workspace_id").in("id", boardIds) : Promise.resolve({ data: [] as any[] }),
      listIds.length ? supabase.from("lists").select("id,name").in("id", listIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const workspaceIds = [...new Set((boardRows ?? []).map(b => b.workspace_id))];
    const { data: workspaceRows } = workspaceIds.length ? await supabase.from("workspaces").select("id,name").in("id", workspaceIds) : { data: [] as any[] };
    setMyWork((cards ?? []).map(card => {
      const b = boardRows?.find(x => x.id === card.board_id);
      const l = listRows?.find(x => x.id === card.list_id);
      const w = workspaceRows?.find(x => x.id === b?.workspace_id);
      return { ...card, board_name: b?.name ?? "Board", workspace_name: w?.name ?? "Workspace", list_name: l?.name ?? "List" };
    }));
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
    if (!userId) return;
    void loadMyWork();
    void loadNotifications();
  }, [userId]);

  useEffect(() => {
    if (!orgId || !userId || activeNav !== "Overview") return;
    void loadExecutiveDashboard();
  }, [orgId, userId, activeNav]);

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
    const [labelRes, commentRes, checklistRes, memberRes, activityRes, fieldRes] = await Promise.all([
      supabase.from("card_labels").select("label_id").eq("card_id", card.id),
      supabase.from("comments").select("id,user_id,body,created_at").eq("card_id", card.id).order("created_at", { ascending: true }),
      supabase.from("checklists").select("id,card_id,name").eq("card_id", card.id).order("created_at", { ascending: true }),
      supabase.from("card_members").select("user_id").eq("card_id", card.id),
      supabase.from("activities").select("id,user_id,action_type,metadata,created_at").eq("card_id", card.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("card_custom_field_values").select("field_id,value").eq("card_id", card.id),
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
    setCardLabelIds((labelRes.data ?? []).map(x => x.label_id));
    setCustomValues(Object.fromEntries((fieldRes.data ?? []).map(x => [x.field_id, x.value ?? ""])));
  }

  async function openCard(card: DbCard) {
    const [{ data: boardLabels }, { data: fields }] = await Promise.all([
      supabase.from("labels").select("id,board_id,name,color").eq("board_id", card.board_id).order("created_at", { ascending: true }),
      supabase.from("custom_fields").select("id,board_id,name,field_type,options,position").eq("board_id", card.board_id).order("position", { ascending: true })
    ]);
    setLabels((boardLabels ?? []) as Label[]);
    setCustomFields((fields ?? []).map(f => ({...f, options: Array.isArray(f.options) ? f.options as string[] : []})) as CustomField[]);
    setSelectedCard(card);
    await loadCardDetails(card);
  }

  async function toggleCardLabel(label: Label) {
    if (!selectedCard) return;
    if (cardLabelIds.includes(label.id)) {
      const { error: e } = await supabase.from("card_labels").delete().eq("card_id", selectedCard.id).eq("label_id", label.id);
      if (e) setError(e.message); else { setCardLabelIds(prev => prev.filter(id => id !== label.id)); await logActivity(selectedCard, "label_removed", {label: label.name}); }
    } else {
      const { error: e } = await supabase.from("card_labels").insert({card_id:selectedCard.id,label_id:label.id});
      if (e) setError(e.message); else { setCardLabelIds(prev => [...prev,label.id]); await logActivity(selectedCard, "label_added", {label: label.name}); }
    }
  }

  async function createBoardLabel() {
    if (!board) return;
    const name = window.prompt("Label name");
    if (!name?.trim()) return;
    const color = window.prompt("Label color (hex)", "#635bff") || "#635bff";
    const { data, error: e } = await supabase.from("labels").insert({board_id:board.id,name:name.trim(),color}).select("id,board_id,name,color").single();
    if (e) setError(e.message); else if (data) setLabels(prev => [...prev,data]);
  }

  async function createCustomField() {
    if (!board) return;
    const name = window.prompt("Custom field name");
    if (!name?.trim()) return;
    const type = (window.prompt("Type: text, number, select, date, checkbox", "text") || "text").toLowerCase();
    if (!["text","number","select","date","checkbox"].includes(type)) { setError("Use text, number, select, date, or checkbox."); return; }
    let options: string[] = [];
    if (type === "select") options = (window.prompt("Select options, separated by commas") || "").split(",").map(x=>x.trim()).filter(Boolean);
    const { data, error: e } = await supabase.from("custom_fields").insert({board_id:board.id,name:name.trim(),field_type:type,options}).select("id,board_id,name,field_type,options,position").single();
    if (e) setError(e.message); else if (data) setCustomFields(prev => [...prev, {...data, options:Array.isArray(data.options)?data.options:[]} as CustomField]);
  }

  async function saveCustomValue(field: CustomField, value: string) {
    if (!selectedCard) return;
    const { error: e } = await supabase.from("card_custom_field_values").upsert({card_id:selectedCard.id,field_id:field.id,value,updated_at:new Date().toISOString()});
    if (e) setError(e.message); else setCustomValues(prev => ({...prev,[field.id]:value}));
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
      if (action === "card_completed") await runAutomationRules("card_completed", data);
      await loadWorkspace(activeWorkspace!);
    }
    setSaving(false);
  }

  async function addWorkspaceMember() {
    if (!activeWorkspace || !userId) return;
    const memberId = window.prompt("Enter the teammate's Exito user ID");
    if (!memberId?.trim()) return;
    const { data: profile } = await supabase.from("profiles").select("id,full_name").eq("id", memberId.trim()).maybeSingle();
    if (!profile) { setError("No Exito user was found for that user ID."); return; }
    const { error: e } = await supabase.from("workspace_members").insert({ workspace_id: activeWorkspace.id, user_id: profile.id, role: "member" });
    if (e) setError(e.message); else await loadWorkspace(activeWorkspace);
  }

  async function createWorkspace() {
    if (!orgId || !userId) return;
    const name = window.prompt("Name your workspace");
    if (!name?.trim()) return;
    const slugBase = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = slugBase || `workspace-${Date.now()}`;
    setSaving(true); setError("");
    const { data, error: e } = await supabase.from("workspaces").insert({ organization_id: orgId, name: name.trim(), slug, icon: null }).select("id,name,icon").single();
    if (e) setError(e.message);
    else if (data) {
      await supabase.from("workspace_members").insert({ workspace_id: data.id, user_id: userId, role: "owner" });
      setWorkspaces(prev => [...prev, data]);
      await loadWorkspace(data);
    }
    setSaving(false);
  }

  async function updateBoardSettings() {
    if (!board) return;
    const name = window.prompt("Board name", board.name);
    if (!name?.trim()) return;
    const description = window.prompt("Board description", board.description ?? "") ?? board.description ?? null;
    const { data, error: e } = await supabase.from("boards").update({ name: name.trim(), description }).eq("id", board.id)
      .select("id,workspace_id,name,description,background,visibility").single();
    if (e) setError(e.message); else if (data) { setBoard(data); setBoards(prev => prev.map(b => b.id === data.id ? data : b)); }
  }

  async function archiveBoard() {
    if (!board || !activeWorkspace) return;
    if (!window.confirm(`Archive "${board.name}"?`)) return;
    const { error: e } = await supabase.from("boards").update({ archived_at: new Date().toISOString() }).eq("id", board.id);
    if (e) setError(e.message); else { setBoard(null); await loadWorkspace(activeWorkspace); }
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

  async function loadTemplates() {
    if (!orgId) return;
    setTemplatesLoading(true);
    const { data, error: e } = await supabase.from("board_templates")
      .select("id,name,description,icon,created_at").eq("organization_id", orgId).order("created_at", { ascending: true });
    if (e) setError(e.message); else setTemplates((data ?? []) as BoardTemplate[]);
    setTemplatesLoading(false);
  }

  async function loadAutomationRules() {
    if (!board) return;
    setAutomationsLoading(true);
    const { data, error: e } = await supabase.from("automation_rules")
      .select("id,board_id,name,trigger_type,action_type,config,enabled").eq("board_id", board.id).order("created_at", { ascending: true });
    if (e) setError(e.message); else setAutomationRules((data ?? []) as AutomationRule[]);
    setAutomationsLoading(false);
  }

  async function createBoardFromTemplate(template: BoardTemplate) {
    if (!activeWorkspace || !userId) return;
    setSaving(true); setError("");
    const { data: templateLists, error: listsError } = await supabase.from("board_template_lists")
      .select("name,position").eq("template_id", template.id).order("position", { ascending: true });
    if (listsError) { setError(listsError.message); setSaving(false); return; }
    const { data: templateLabels, error: labelsError } = await supabase.from("board_template_labels")
      .select("name,color").eq("template_id", template.id);
    if (labelsError) { setError(labelsError.message); setSaving(false); return; }
    const { data: templateFields, error: fieldsError } = await supabase.from("board_template_fields")
      .select("name,field_type,options,position").eq("template_id", template.id).order("position", { ascending: true });
    if (fieldsError) { setError(fieldsError.message); setSaving(false); return; }

    const boardName = window.prompt("Board name", template.name.replace(/^.*?—\s*/, "").trim()) || template.name;
    const { data: newBoard, error: boardError } = await supabase.from("boards")
      .insert({ workspace_id: activeWorkspace.id, name: boardName.trim(), description: template.description, created_by: userId })
      .select("id,workspace_id,name,description,background,visibility").single();
    if (boardError || !newBoard) { setError(boardError?.message ?? "Could not create board."); setSaving(false); return; }

    const { data: createdLists, error: createListsError } = await supabase.from("lists").insert(
      (templateLists ?? []).map(l => ({ board_id: newBoard.id, name: l.name, position: l.position }))
    ).select("id,name,position");
    if (createListsError) { setError(createListsError.message); setSaving(false); return; }

    if ((templateLabels ?? []).length) {
      const { error: e } = await supabase.from("labels").insert((templateLabels ?? []).map(l => ({ board_id: newBoard.id, name: l.name, color: l.color })));
      if (e) setError(e.message);
    }
    if ((templateFields ?? []).length) {
      const { error: e } = await supabase.from("custom_fields").insert((templateFields ?? []).map(f => ({ board_id: newBoard.id, name: f.name, field_type: f.field_type, options: f.options, position: f.position })));
      if (e) setError(e.message);
    }
    setBoards(prev => [...prev, newBoard]);
    setBoard(newBoard);
    setActiveNav("Boards");
    await loadBoard(newBoard, activeWorkspace);
    setSaving(false);
  }

  async function createAutomation() {
    if (!board || !userId) return;
    const name = window.prompt("Automation name", "When a card is completed");
    if (!name?.trim()) return;
    const trigger = (window.prompt("Trigger: card_created, card_moved, card_completed, due_date_approaching", "card_completed") || "card_completed").trim();
    const action = (window.prompt("Action: move_card, add_label, assign_member, create_comment", "move_card") || "move_card").trim();
    const configText = window.prompt("Config JSON", "{}") || "{}";
    let config: Record<string, unknown>;
    try { config = JSON.parse(configText); } catch { setError("Automation config must be valid JSON."); return; }
    if (!["card_created","card_moved","card_completed","due_date_approaching"].includes(trigger)) { setError("Invalid automation trigger."); return; }
    if (!["move_card","add_label","assign_member","create_comment"].includes(action)) { setError("Invalid automation action."); return; }
    const { data, error: e } = await supabase.from("automation_rules").insert({
      board_id: board.id, name: name.trim(), trigger_type: trigger, action_type: action, config, enabled: true, created_by: userId
    }).select("id,board_id,name,trigger_type,action_type,config,enabled").single();
    if (e) setError(e.message); else if (data) setAutomationRules(prev => [...prev, data as AutomationRule]);
  }

  async function toggleAutomation(rule: AutomationRule) {
    const { error: e } = await supabase.from("automation_rules").update({ enabled: !rule.enabled }).eq("id", rule.id);
    if (e) setError(e.message); else setAutomationRules(prev => prev.map(r => r.id === rule.id ? {...r, enabled: !r.enabled} : r));
  }

  async function deleteAutomation(rule: AutomationRule) {
    if (!window.confirm(`Delete automation "${rule.name}"?`)) return;
    const { error: e } = await supabase.from("automation_rules").delete().eq("id", rule.id);
    if (e) setError(e.message); else setAutomationRules(prev => prev.filter(r => r.id !== rule.id));
  }

  async function runAutomationRules(trigger: string, card: DbCard, context: Record<string, unknown> = {}) {
    if (!board) return;
    const { data: rules } = await supabase.from("automation_rules").select("id,name,trigger_type,action_type,config,enabled").eq("board_id", card.board_id).eq("trigger_type", trigger).eq("enabled", true);
    for (const rule of (rules ?? []) as AutomationRule[]) {
      const cfg = rule.config ?? {};
      if (rule.action_type === "move_card" && typeof cfg.list_id === "string") {
        await supabase.from("cards").update({ list_id: cfg.list_id }).eq("id", card.id);
      } else if (rule.action_type === "add_label" && typeof cfg.label_id === "string") {
        await supabase.from("card_labels").upsert({ card_id: card.id, label_id: cfg.label_id });
      } else if (rule.action_type === "assign_member" && typeof cfg.user_id === "string") {
        await supabase.from("card_members").upsert({ card_id: card.id, user_id: cfg.user_id });
      } else if (rule.action_type === "create_comment" && typeof cfg.body === "string") {
        await supabase.from("comments").insert({ card_id: card.id, user_id: userId, body: cfg.body });
      }
      await logActivity(card, "automation_executed", { rule: rule.name, trigger, context });
    }
    if ((rules ?? []).length) await loadWorkspace(activeWorkspace!);
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
    if (!insertError && data) await runAutomationRules("card_created", data);
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
    else if (data) {
      setSelectedCard(selectedCard?.id === data.id ? data : selectedCard);
      await logActivity(data, "card_moved", { to_list: targetList.name });
      await runAutomationRules("card_moved", data, { to_list: targetList.name });
      if (completedAt) await runAutomationRules("card_completed", data, { to_list: targetList.name });
      await loadWorkspace(activeWorkspace!);
    }
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
    [LayoutDashboard, "Overview"], [BriefcaseBusiness, "My Work"], [Grid2X2, "Boards"], [Bell, "Notifications"],
    [CalendarDays, "Calendar"], [Users, "Team"], [Grid2X2, "Templates"], [Sparkles, "Automations"],
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
          <div className="section-heading"><span>YOUR BUSINESSES</span><button className="side-add" onClick={()=>void createWorkspace()} aria-label="Create workspace"><CirclePlus size={15}/></button></div>
          {workspaces.map(workspace => {
            const style=workspaceStyle[workspace.name] ?? {initials:initials(workspace.name),tone:"navy"};
            return <button key={workspace.id} className={activeWorkspace?.id===workspace.id?"business active":"business"} onClick={()=>loadWorkspace(workspace)}>
              <span className={"mini-avatar "+style.tone}>{style.initials}</span><span>{workspace.name}</span>
            </button>;
          })}
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={()=>board && void updateBoardSettings()}><Settings2 size={18}/><span>Settings</span></button>
          <div className="user-chip"><div className="user-avatar">{initials(userName)}</div><div><strong>{userName}</strong><span>Owner</span></div><MoreHorizontal size={17}/></div>
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="breadcrumbs"><span>Exito</span><span>/</span><strong>{activeWorkspace?.name ?? "Workspace"}</strong></div>
          <div className="top-actions">
            <label className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search work..."/><kbd><Command size={12}/> K</kbd></label>
            <button className="icon-button notification-button" onClick={()=>setActiveNav("Notifications")} aria-label="Notifications"><Bell size={18}/>{notifications.some(n=>!n.read_at) && <span className="notification-dot" />}</button><div className="top-avatar">{initials(userName)}</div>
          </div>
        </header>

        <div className="content">
          <div className="hero-row"><div><span className="eyebrow">Good morning, {userName.split(" ")[0]}</span><h1>{activeNav==="Overview" ? "Your business at a glance." : activeNav}</h1><p>One place to see what is moving, what needs attention, and what comes next.</p></div>
            {board && <button className="primary-button" onClick={()=>addCard(columns[0]?.id)} disabled={saving}><CirclePlus size={17}/> {saving?"Saving...":"New work"}</button>}
          </div>

          <div className="metrics">
            <div className="metric"><span>Active work</span><strong>{dashboardCards.filter(c=>!c.completed_at).length}</strong><small>across all businesses</small></div>
            <div className="metric"><span>Overdue</span><strong>{dashboardCards.filter(c=>!c.completed_at&&c.due_date&&new Date(c.due_date).getTime()<Date.now()).length}</strong><small>needs attention</small></div>
            <div className="metric"><span>Due next 7 days</span><strong>{dashboardCards.filter(c=>!c.completed_at&&c.due_date&&new Date(c.due_date).getTime()>=Date.now()&&new Date(c.due_date).getTime()<=Date.now()+7*86400000).length}</strong><small>upcoming</small></div>
            <div className="metric"><span>Completed</span><strong>{dashboardCards.filter(c=>c.completed_at&&new Date(c.completed_at).getTime()>=Date.now()-7*86400000).length}</strong><small>in the last 7 days</small></div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {activeNav === "Overview" ? (
            dashboardLoading ? <div className="loading-state"><Loader2 className="spin" size={22}/><span>Preparing your executive view...</span></div> :
            <section className="executive-dashboard">
              <div className="dashboard-grid">
                <div className="dashboard-card"><div className="dashboard-card-head"><div><span className="eyebrow">Priority</span><h2>What needs attention</h2></div><button className="text-button" onClick={()=>setActiveNav("My Work")}>View my work</button></div><div className="priority-list">
                  {dashboardCards.filter(c=>!c.completed_at&&c.due_date&&new Date(c.due_date).getTime()<Date.now()).slice(0,4).map(card=><button className="priority-row" key={card.id} onClick={()=>{setActiveNav("Boards");const b=boards.find(x=>x.id===card.board_id);if(b&&activeWorkspace)void loadBoard(b,activeWorkspace);void openCard(card);}}><span className="priority-icon overdue">!</span><span><strong>{card.title}</strong><small>{card.workspace_name} · {card.list_name}</small></span><em>Overdue</em></button>)}
                  {!dashboardCards.some(c=>!c.completed_at&&c.due_date&&new Date(c.due_date).getTime()<Date.now())&&<div className="dashboard-empty"><Check size={17}/> No overdue work right now.</div>}
                </div></div>
                <div className="dashboard-card"><div className="dashboard-card-head"><div><span className="eyebrow">Next 7 days</span><h2>Upcoming</h2></div><button className="text-button" onClick={()=>setActiveNav("Calendar")}>Open calendar</button></div><div className="priority-list">
                  {dashboardCards.filter(c=>!c.completed_at&&c.due_date&&new Date(c.due_date).getTime()>=Date.now()&&new Date(c.due_date).getTime()<=Date.now()+7*86400000).slice(0,5).map(card=><button className="priority-row" key={card.id} onClick={()=>{setActiveNav("Boards");const b=boards.find(x=>x.id===card.board_id);if(b&&activeWorkspace)void loadBoard(b,activeWorkspace);void openCard(card);}}><span className="priority-icon"><CalendarDays size={14}/></span><span><strong>{card.title}</strong><small>{card.workspace_name} · {card.list_name}</small></span><em>{new Date(card.due_date!).toLocaleDateString("en-NG",{day:"numeric",month:"short"})}</em></button>)}
                  {!dashboardCards.some(c=>!c.completed_at&&c.due_date&&new Date(c.due_date).getTime()>=Date.now()&&new Date(c.due_date).getTime()<=Date.now()+7*86400000)&&<div className="dashboard-empty"><CalendarDays size={17}/> Nothing due in the next 7 days.</div>}
                </div></div>
              </div>
              <div className="dashboard-grid dashboard-grid-bottom">
                <div className="dashboard-card"><div className="dashboard-card-head"><div><span className="eyebrow">Across Exito</span><h2>Business performance</h2></div></div><div className="business-performance">{workspaces.map(w=>{const rows=dashboardCards.filter(c=>c.workspace_name===w.name);const active=rows.filter(c=>!c.completed_at).length;const done=rows.filter(c=>!!c.completed_at).length;const overdue=rows.filter(c=>!c.completed_at&&c.due_date&&new Date(c.due_date).getTime()<Date.now()).length;return <button key={w.id} className="business-performance-row" onClick={()=>void loadWorkspace(w)}><span className={"mini-avatar "+(workspaceStyle[w.name]?.tone??"navy")}>{workspaceStyle[w.name]?.initials??initials(w.name)}</span><span className="business-performance-copy"><strong>{w.name}</strong><small>{active} active · {done} completed · {overdue} overdue</small></span><span className="performance-bar"><i /></span></button>})}</div></div>
                <div className="dashboard-card"><div className="dashboard-card-head"><div><span className="eyebrow">Team</span><h2>Workload</h2></div><button className="text-button" onClick={()=>setActiveNav("Team")}>Manage team</button></div><div className="workload-list">{dashboardMembers.slice(0,6).map(m=><div className="workload-row" key={m.user_id}><span className="assignee">{initials(m.name)}</span><span className="workload-copy"><strong>{m.name}</strong><small>{m.active} active · {m.completed} completed</small></span>{m.overdue>0&&<em>{m.overdue} overdue</em>}</div>)}{!dashboardMembers.length&&<div className="dashboard-empty"><Users size={17}/> No assigned team workload yet.</div>}</div></div>
              </div>
              <div className="dashboard-card activity-dashboard"><div className="dashboard-card-head"><div><span className="eyebrow">Live pulse</span><h2>Recent activity</h2></div><button className="text-button" onClick={()=>void loadExecutiveDashboard()}>Refresh</button></div><div className="activity-feed">{dashboardActivities.slice(0,10).map(a=><div className="dashboard-activity" key={a.id}><span className="activity-dot"/><div><strong>{a.user_name}</strong> {prettyAction(a.action_type).toLowerCase()}<small>{new Date(a.created_at).toLocaleString("en-NG")}</small></div></div>)}{!dashboardActivities.length&&<div className="dashboard-empty"><Clock3 size={17}/> Activity will appear here as work moves.</div>}</div></div>
              <div className="dashboard-quick-actions"><button className="secondary-button" onClick={()=>setActiveNav("My Work")}><BriefcaseBusiness size={15}/> My work</button><button className="secondary-button" onClick={()=>setActiveNav("Boards")}><Grid2X2 size={15}/> Open boards</button><button className="secondary-button" onClick={()=>setActiveNav("Calendar")}><CalendarDays size={15}/> Calendar</button><button className="secondary-button" onClick={()=>setActiveNav("Team")}><Users size={15}/> Team</button></div>
            </section>
          ) : null}
          {activeNav === "Boards" && <div className="section-title">
            <div><span className="eyebrow">Active board</span><h2>{board?.name ?? "No board yet"}</h2></div>
            {board && <div className="board-switcher">
              <select value={board.id} onChange={e => {
                const next = boards.find(b => b.id === e.target.value);
                if (next && activeWorkspace) void loadBoard(next, activeWorkspace);
              }}>
                {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button className="secondary-button" onClick={()=>void updateBoardSettings()}><Settings2 size={15}/> Board settings</button><button className="secondary-button" onClick={()=>void createBoard()}><CirclePlus size={15}/> New board</button>
            </div>}
            <div className="view-actions">
              <button className={boardView==="board"?"view-button active":"view-button"} onClick={()=>setBoardView("board")}><Grid2X2 size={15}/> Board</button>
              <button className={boardView==="calendar"?"view-button active":"view-button"} onClick={()=>setBoardView("calendar")}><CalendarDays size={15}/> Calendar</button>
              <button className={boardView==="timeline"?"view-button active":"view-button"} onClick={()=>setBoardView("timeline")}><Clock3 size={15}/> Timeline</button>
              {board && <button className="view-button" onClick={addList}><CirclePlus size={15}/> List</button>}
            </div>
          </div>}

          {activeNav === "Templates" ? (
            <section className="my-work-panel">
              <div className="my-work-head"><div><span className="eyebrow">Reusable workflows</span><h2>Board Templates</h2><p>Start a new board with lists, labels and custom fields already configured.</p></div><button className="secondary-button" onClick={()=>void loadTemplates()}><Clock3 size={15}/> Refresh</button></div>
              {templatesLoading ? <div className="loading-state"><Loader2 className="spin" size={22}/><span>Loading templates...</span></div> :
                templates.length ? <div className="template-grid">{templates.map(t=><article className="template-card" key={t.id}><div className="template-icon">{t.icon ?? "EX"}</div><div className="template-copy"><strong>{t.name}</strong><p>{t.description}</p></div><button className="primary-button" onClick={()=>void createBoardFromTemplate(t)} disabled={saving}><CirclePlus size={14}/> Use template</button></article>)}</div> :
                <div className="empty-state"><Grid2X2 size={25}/><strong>No templates yet</strong><p>Reusable workflows will appear here.</p></div>}
            </section>
          ) : activeNav === "Automations" ? (
            <section className="my-work-panel">
              <div className="my-work-head"><div><span className="eyebrow">Board rules</span><h2>Automations</h2><p>Let Exito perform repeatable actions when work changes.</p></div><button className="secondary-button" onClick={()=>void createAutomation()} disabled={!board}><Plus size={15}/> New automation</button></div>
              {!board ? <div className="empty-state"><Sparkles size={25}/><strong>Select a board first</strong><p>Open Boards, choose a board, then return here to manage its rules.</p></div> :
                <><div className="automation-toolbar"><span className="eyebrow">Active board</span><strong>{board.name}</strong><button className="secondary-button" onClick={()=>void loadAutomationRules()}><Clock3 size={14}/> Refresh</button></div>
                {automationsLoading ? <div className="loading-state"><Loader2 className="spin" size={22}/><span>Loading automations...</span></div> :
                  automationRules.length ? <div className="my-work-list">{automationRules.map(rule=><div className="my-work-item" key={rule.id}><span className="my-work-check">{rule.enabled ? <Check size={16}/> : <span>·</span>}</span><span className="my-work-copy"><strong>{rule.name}</strong><small>When {rule.trigger_type.replace(/_/g," ")} → {rule.action_type.replace(/_/g," ")}</small></span><button className="icon-button" onClick={()=>void toggleAutomation(rule)}>{rule.enabled ? "On" : "Off"}</button><button className="icon-button" onClick={()=>void deleteAutomation(rule)}><Trash2 size={14}/></button></div>)}</div> :
                  <div className="empty-state"><Zap size={25}/><strong>No automations yet</strong><p>Create a rule to automate repeatable board actions.</p></div>}</>}
            </section>
          ) : activeNav === "Notifications" ? (
            <section className="my-work-panel">
              <div className="my-work-head"><div><span className="eyebrow">Updates</span><h2>Notifications</h2><p>Important activity and updates sent to you.</p></div><button className="secondary-button" onClick={()=>void loadNotifications()}><Bell size={15}/> Refresh</button></div>
              {notifications.length ? <div className="my-work-list">{notifications.map(n=><button key={n.id} className={n.read_at ? "my-work-item" : "my-work-item notification-unread"} onClick={()=>void markNotificationRead(n)}>
                <span className="my-work-check"><Bell size={13}/></span><span className="my-work-copy"><strong>{n.title}</strong><small>{n.body ?? n.type} · {new Date(n.created_at).toLocaleString("en-NG")}</small></span><span className="my-work-date">{n.read_at ? "Read" : "New"}</span>
              </button>)}</div> : <div className="empty-state"><Bell size={25}/><strong>You're all caught up</strong><p>New assignments, comments and important updates will appear here.</p></div>}
            </section>
          ) : activeNav === "My Work" ? (
            <section className="my-work-panel">
              <div className="my-work-head"><div><span className="eyebrow">Assigned to you</span><h2>My Work</h2><p>Everything currently assigned to you across Exito.</p></div><button className="secondary-button" onClick={()=>void loadMyWork()}><Clock3 size={15}/> Refresh</button></div>
              {myWork.length ? <div className="my-work-list">{myWork.map(card => <button key={card.id} className="my-work-item" onClick={()=>{setActiveNav("Boards"); const b=boards.find(x=>x.id===card.board_id); if(b&&activeWorkspace) void loadBoard(b,activeWorkspace); void openCard(card);}}>
                <span className="my-work-check">{card.completed_at ? <Check size={13}/> : ""}</span><span className="my-work-copy"><strong>{card.title}</strong><small>{card.workspace_name} · {card.board_name} · {card.list_name}</small></span><span className="my-work-date">{metaFor(card)}</span>
              </button>)}</div> : <div className="empty-state"><BriefcaseBusiness size={25}/><strong>No assigned work</strong><p>Cards assigned to you will appear here across your workspaces.</p></div>}
            </section>
          ) : activeNav === "Calendar" ? (
            <section className="my-work-panel">
              <div className="my-work-head"><div><span className="eyebrow">Deadlines</span><h2>Calendar</h2><p>Upcoming work with due dates on the active board.</p></div></div>
              {columns.flatMap(c=>c.cards.map(card=>({...card,list_name:c.name}))).filter(card=>card.due_date).sort((a,b)=>new Date(a.due_date!).getTime()-new Date(b.due_date!).getTime()).length ?
                <div className="my-work-list">{columns.flatMap(c=>c.cards.map(card=>({...card,list_name:c.name}))).filter(card=>card.due_date).sort((a,b)=>new Date(a.due_date!).getTime()-new Date(b.due_date!).getTime()).map(card=><button key={card.id} className="my-work-item" onClick={()=>void openCard(card)}>
                  <span className="my-work-check"><CalendarDays size={14}/></span><span className="my-work-copy"><strong>{card.title}</strong><small>{card.list_name} · {board?.name ?? "Board"}</small></span><span className="my-work-date">{new Date(card.due_date!).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</span>
                </button>)}</div>
                : <div className="empty-state"><CalendarDays size={25}/><strong>No deadlines on this board</strong><p>Add due dates to cards and they will appear here.</p></div>}
            </section>
          ) : activeNav === "Team" ? (
            <section className="my-work-panel">
              <div className="my-work-head"><div><span className="eyebrow">Workspace members</span><h2>Team</h2><p>People who can collaborate on this workspace.</p></div><button className="secondary-button" onClick={()=>void addWorkspaceMember()}><Users size={15}/> Add member</button></div>
              {members.length ? <div className="my-work-list">{members.map(member=><div key={member.user_id} className="my-work-item"><span className="my-work-check assignee">{initials(member.name)}</span><span className="my-work-copy"><strong>{member.name}</strong><small>{member.user_id===userId ? `You · ${member.role ?? "member"}` : (member.role ?? "member")}</small></span></div>)}</div> : <div className="empty-state"><Users size={25}/><strong>No team members found</strong><p>Workspace members will appear here when they are added.</p></div>}
            </section>
          ) : activeNav === "Boards" ? (loading ? <div className="loading-state"><Loader2 className="spin" size={22}/><span>Loading Exito...</span></div> :
            !board ? <div className="empty-state"><Grid2X2 size={26}/><strong>No board yet</strong><p>This workspace is ready for its first board.</p><button className="primary-button" onClick={createBoard} disabled={saving}><CirclePlus size={16}/> {saving?"Creating...":"Create board"}</button></div> :
            boardView==="board" ? <div className="board">
              {filteredColumns.map(column => (
                <div className="column" key={column.id} onDragOver={e=>e.preventDefault()} onDrop={()=>dragCardId && void moveCard(dragCardId,column)}>
                  <div className="column-header"><div><span className="column-dot"></span><strong>{column.name}</strong><span className="count">{column.cards.length}</span></div>
                    <button className="column-more" onClick={()=>renameList(column)} title="Rename list"><MoreHorizontal size={17}/></button>
                  </div>
                  <div className="card-stack">
                    {column.cards.map(card => <article className="task-card" key={card.id} draggable onDragStart={()=>setDragCardId(card.id)} onClick={()=>void openCard(card)}>
                      <div className="card-top"><div className="labels"><span className="label">{board.name}</span></div><button className="card-more" onClick={e=>{e.stopPropagation();void openCard(card)}}><MoreHorizontal size={15}/></button></div>
                      <h3>{card.title}</h3><div className="card-footer"><span className="card-meta">{metaFor(card)}</span><span className="assignee">{initials(userName)}</span></div>
                    </article>)}
                    <button className="add-card" onClick={()=>addCard(column.id)} disabled={saving}><CirclePlus size={15}/> {saving?"Saving...":"Add work"}</button>
                  </div>
                </div>
              ))}
              <button className="add-list-column" onClick={addList}><CirclePlus size={17}/> Add another list</button>
            </div> : boardView==="calendar" ? <div className="board-view-list">
              {filteredColumns.flatMap(c=>c.cards.map(card=>({...card,list_name:c.name}))).filter(card=>card.due_date).sort((a,b)=>new Date(a.due_date!).getTime()-new Date(b.due_date!).getTime()).map(card=>
                <button className="board-view-row" key={card.id} onClick={()=>void openCard(card)}><span className="board-view-date"><CalendarDays size={14}/>{new Date(card.due_date!).toLocaleDateString("en-NG",{day:"2-digit",month:"short"})}</span><span className="board-view-main"><strong>{card.title}</strong><small>{card.list_name}</small></span><span className="board-view-meta">{metaFor(card)}</span></button>
              )}
              {!filteredColumns.some(c=>c.cards.some(card=>card.due_date)) && <div className="empty-state"><CalendarDays size={25}/><strong>No dated work</strong><p>Add due dates to see the board in calendar order.</p></div>}
            </div> : <div className="board-view-list">
              {filteredColumns.flatMap(c=>c.cards.map(card=>({...card,list_name:c.name}))).sort((a,b)=>(a.due_date?new Date(a.due_date).getTime():Infinity)-(b.due_date?new Date(b.due_date).getTime():Infinity)).map(card=>
                <button className="board-view-row" key={card.id} onClick={()=>void openCard(card)}><span className="board-view-date"><Clock3 size={14}/>{card.due_date?new Date(card.due_date).toLocaleDateString("en-NG",{day:"2-digit",month:"short"}):"No date"}</span><span className="board-view-main"><strong>{card.title}</strong><small>{card.list_name} · {board.name}</small></span><span className="board-view-meta">{metaFor(card)}</span></button>
              )}
              {!filteredColumns.some(c=>c.cards.length) && <div className="empty-state"><Clock3 size={25}/><strong>No work yet</strong><p>Add cards to build your timeline.</p></div>}
            </div>
          ) : null}

          <div className="ai-strip"><div className="ai-icon"><Sparkles size={18}/></div><div><strong>Exito AI is coming to the board.</strong><p>Ask what needs attention, create work from a conversation, or let Exito prepare your next action plan.</p></div><button className="secondary-button" disabled title="AI assistant is being prepared">Explore AI</button></div>
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

            <div className="drawer-section"><div className="drawer-section-head"><h3>Labels</h3><button className="text-button" onClick={()=>void createBoardLabel()}>+ New label</button></div>
              <div className="label-manager">{labels.map(label=><button key={label.id} className={cardLabelIds.includes(label.id)?"card-label selected":"card-label"} style={{"--label-color":label.color} as React.CSSProperties} onClick={()=>void toggleCardLabel(label)}>{label.name}</button>)}{!labels.length&&<span className="drawer-muted">No labels yet. Create one for this board.</span>}</div>
            </div>
            <div className="drawer-section"><div className="drawer-section-head"><h3>Custom fields</h3><button className="text-button" onClick={()=>void createCustomField()}>+ Add field</button></div>
              <div className="custom-field-list">{customFields.map(field=>{const value=customValues[field.id]??""; return <div className="custom-field-row" key={field.id}><label>{field.name}</label>{field.field_type==="select"?<select value={value} onChange={e=>void saveCustomValue(field,e.target.value)}><option value="">Select...</option>{field.options.map(o=><option key={o} value={o}>{o}</option>)}</select>:field.field_type==="checkbox"?<input type="checkbox" checked={value==="true"} onChange={e=>void saveCustomValue(field,e.target.checked?"true":"false")}/>:<input type={field.field_type==="date"?"date":field.field_type==="number"?"number":"text"} value={value} onChange={e=>setCustomValues(prev=>({...prev,[field.id]:e.target.value}))} onBlur={()=>void saveCustomValue(field,customValues[field.id]??"")} placeholder={"Enter "+field.name.toLowerCase()}/>}</div>})}{!customFields.length&&<span className="drawer-muted">Add fields such as Client, Amount, Priority or Payment Status.</span>}</div>
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
