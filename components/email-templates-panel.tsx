"use client";

import { useMemo, useState } from "react";
import { Eye, Image as ImageIcon, Mail, Monitor, PlayCircle, Plus, Save, Search, Smartphone, X } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type EmailTemplate = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  subject: string;
  preheader: string | null;
  design: Record<string, unknown>;
  html: string;
  created_at: string;
  updated_at: string;
};

type Editor = {
  subject: string;
  preheader: string;
  eyebrow: string;
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl: string;
  videoThumbnail: string;
  videoUrl: string;
  accent: string;
  footer: string;
};

const defaults: Editor = {
  subject: "A fresh update from your team",
  preheader: "A quick update worth opening.",
  eyebrow: "A QUICK UPDATE",
  headline: "Your headline goes here.",
  body: "Write a concise message that gives your reader the context they need and makes the next step obvious.",
  ctaText: "Take the next step",
  ctaUrl: "https://example.com",
  imageUrl: "",
  videoThumbnail: "",
  videoUrl: "",
  accent: "#635bff",
  footer: "You are receiving this email because you are connected with our team.",
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function makeHtml(editor: Editor, layout: string) {
  const e = Object.fromEntries(Object.entries(editor).map(([key, value]) => [key, escapeHtml(value)])) as Editor;
  const image = e.imageUrl
    ? `<img src="${e.imageUrl}" alt="" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:14px;margin:0 auto 24px;">`
    : "";
  const video = e.videoThumbnail
    ? `<a href="${e.videoUrl || "#"}" style="display:block;text-decoration:none;"><img src="${e.videoThumbnail}" alt="Watch video" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:14px;margin:0 auto 24px;"></a>`
    : "";
  const media = layout === "video" ? video || image : image;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="x-ua-compatible" content="ie=edge"><style>@media(max-width:600px){.wrap{width:100%!important}.pad{padding:28px 20px!important}.title{font-size:30px!important;line-height:1.08!important}.btn{width:100%!important}.stats{display:block!important}.stat{display:block!important;width:100%!important;margin-bottom:10px!important}}</style></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#111827;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e.preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f5f7;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" class="wrap" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border-radius:18px;overflow:hidden;"><tr><td class="pad" style="padding:42px 44px 34px;"><div style="font-size:12px;font-weight:800;letter-spacing:1.8px;color:${e.accent};margin-bottom:14px;">${e.eyebrow}</div><h1 class="title" style="font-size:40px;line-height:1.04;letter-spacing:-1.5px;margin:0 0 18px;color:#111827;">${e.headline}</h1>${media}<p style="font-size:16px;line-height:1.7;color:#596273;margin:0 0 26px;white-space:pre-line;">${e.body}</p><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:9px;background:${e.accent};"><a class="btn" href="${e.ctaUrl}" style="display:inline-block;padding:14px 20px;color:#fff;text-decoration:none;font-weight:800;font-size:14px;">${e.ctaText}</a></td></tr></table></td></tr><tr><td style="padding:20px 44px 28px;background:#fafafa;border-top:1px solid #eceef2;"><p style="margin:0;font-size:11px;line-height:1.6;color:#9299a5;">${e.footer}</p></td></tr></table></td></tr></table></body></html>`;
}

function initialEditor(template: EmailTemplate): Editor {
  const design = template.design || {};
  const layout = String(design.layout || "hero");
  const accent = typeof design.accent === "string" ? design.accent : "#635bff";
  return {
    ...defaults,
    subject: template.subject || defaults.subject,
    preheader: template.preheader || defaults.preheader,
    accent,
    eyebrow: template.category.toUpperCase(),
    headline: template.name,
    body: template.description || defaults.body,
    footer: "Exito email template · Edit this footer before sending.",
    ...(layout === "video" ? { ctaText: "Watch the story" } : {}),
  };
}

export default function EmailTemplatesPanel({ orgId, userId }: { orgId: string | null; userId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [editor, setEditor] = useState<Editor>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showEditor, setShowEditor] = useState(false);
  const [error, setError] = useState("");

  async function loadTemplates() {
    if (!orgId) return;
    setLoading(true);
    const { data, error: e } = await supabase.from("email_templates")
      .select("id,name,category,description,subject,preheader,design,html,created_at,updated_at")
      .eq("organization_id", orgId).order("created_at", { ascending: true });
    if (e) setError(e.message); else setTemplates((data ?? []) as EmailTemplate[]);
    setLoading(false);
  }

  useState(() => { void loadTemplates(); });

  const categories = ["All", ...Array.from(new Set(templates.map(t => t.category)))];
  const filtered = templates.filter(t => {
    const matchesCategory = category === "All" || t.category === category;
    const q = query.trim().toLowerCase();
    return matchesCategory && (!q || [t.name, t.category, t.description || ""].some(v => v.toLowerCase().includes(q)));
  });

  function editTemplate(template: EmailTemplate) {
    setSelected(template);
    setEditor(initialEditor(template));
    setShowEditor(true);
    setError("");
  }

  async function saveTemplate() {
    if (!selected) return;
    setSaving(true);
    setError("");
    const layout = String(selected.design?.layout || "hero");
    const html = makeHtml(editor, layout);
    const design = { ...selected.design, accent: editor.accent, layout, blocks: selected.design?.blocks || [] };
    const { data, error: e } = await supabase.from("email_templates").update({
      subject: editor.subject,
      preheader: editor.preheader,
      design,
      html,
    }).eq("id", selected.id).select("id,name,category,description,subject,preheader,design,html,created_at,updated_at").single();
    if (e) setError(e.message);
    else if (data) {
      setTemplates(prev => prev.map(t => t.id === data.id ? data as EmailTemplate : t));
      setSelected(data as EmailTemplate);
    }
    setSaving(false);
  }

  async function createTemplate() {
    if (!orgId || !userId) return;
    const name = window.prompt("Template name", "My new email template");
    if (!name?.trim()) return;
    const { data, error: e } = await supabase.from("email_templates").insert({
      organization_id: orgId,
      name: name.trim(),
      category: "Custom",
      description: "Custom responsive email template",
      subject: "Your subject",
      preheader: "Your preheader",
      design: { accent: "#635bff", layout: "hero", blocks: ["eyebrow","headline","body","cta","footer"] },
      html: makeHtml(defaults, "hero"),
      created_by: userId,
    }).select("id,name,category,description,subject,preheader,design,html,created_at,updated_at").single();
    if (e) setError(e.message);
    else if (data) {
      const template = data as EmailTemplate;
      setTemplates(prev => [...prev, template]);
      editTemplate(template);
    }
  }

  const previewHtml = selected ? makeHtml(editor, String(selected.design?.layout || "hero")) : makeHtml(editor, "hero");

  return (
    <section className="email-templates-panel">
      <div className="my-work-head">
        <div>
          <span className="eyebrow">Email studio</span>
          <h2>Email Templates</h2>
          <p>Choose a ready-made responsive design, edit the content, add graphics or a video thumbnail, and save it for reuse.</p>
        </div>
        <button className="secondary-button" onClick={createTemplate}><Plus size={15}/> New template</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="email-template-toolbar">
        <label className="search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search templates..."/></label>
        <div className="email-category-tabs">{categories.map(c=><button key={c} className={category===c?"active":""} onClick={()=>setCategory(c)}>{c}</button>)}</div>
      </div>
      {loading ? <div className="loading-state"><Mail size={20}/> Loading email templates...</div> :
        <div className="email-template-grid">
          {filtered.map(template => (
            <article className="email-template-card" key={template.id}>
              <div className="email-template-preview">
                <div className="mini-email-bar"><span></span><span></span><span></span></div>
                <div className="mini-email-content"><i style={{background:String(template.design?.accent || "#635bff")}}></i><strong>{template.name}</strong><p>{template.description}</p><b style={{background:String(template.design?.accent || "#635bff")}}></b></div>
              </div>
              <div className="email-template-card-copy"><span className="eyebrow">{template.category}</span><h3>{template.name}</h3><p>{template.description}</p></div>
              <div className="email-template-card-actions"><button className="secondary-button" onClick={()=>editTemplate(template)}><Eye size={14}/> Preview & edit</button><button className="primary-button" onClick={()=>editTemplate(template)}><Mail size={14}/> Use template</button></div>
            </article>
          ))}
        </div>
      }
      {!filtered.length && !loading && <div className="empty-state"><Mail size={25}/><strong>No templates found</strong><p>Create a custom template or change the filter.</p></div>}

      {showEditor && selected && (
        <div className="email-editor-overlay">
          <div className="email-editor">
            <div className="email-editor-head"><div><span className="eyebrow">Template editor</span><h2>{selected.name}</h2></div><button className="icon-button" onClick={()=>setShowEditor(false)}><X size={18}/></button></div>
            <div className="email-editor-layout">
              <div className="email-editor-form">
                <label>Subject<input value={editor.subject} onChange={e=>setEditor({...editor,subject:e.target.value})}/></label>
                <label>Preheader<input value={editor.preheader} onChange={e=>setEditor({...editor,preheader:e.target.value})}/></label>
                <label>Eyebrow<input value={editor.eyebrow} onChange={e=>setEditor({...editor,eyebrow:e.target.value})}/></label>
                <label>Headline<input value={editor.headline} onChange={e=>setEditor({...editor,headline:e.target.value})}/></label>
                <label>Body<textarea rows={6} value={editor.body} onChange={e=>setEditor({...editor,body:e.target.value})}/></label>
                <div className="email-editor-two"><label>CTA text<input value={editor.ctaText} onChange={e=>setEditor({...editor,ctaText:e.target.value})}/></label><label>CTA URL<input value={editor.ctaUrl} onChange={e=>setEditor({...editor,ctaUrl:e.target.value})}/></label></div>
                <label>Image URL <span className="field-hint">Use a hosted JPG/PNG/WebP image</span><input value={editor.imageUrl} onChange={e=>setEditor({...editor,imageUrl:e.target.value})} placeholder="https://..."/></label>
                <label>Video thumbnail URL <span className="field-hint">Email-safe fallback image</span><input value={editor.videoThumbnail} onChange={e=>setEditor({...editor,videoThumbnail:e.target.value})} placeholder="https://..."/></label>
                <label>Video URL <span className="field-hint">Clicking the thumbnail opens the video</span><input value={editor.videoUrl} onChange={e=>setEditor({...editor,videoUrl:e.target.value})} placeholder="https://youtube.com/..."/></label>
                <div className="email-editor-two"><label>Accent<input type="text" value={editor.accent} onChange={e=>setEditor({...editor,accent:e.target.value})}/></label><label>Footer<input value={editor.footer} onChange={e=>setEditor({...editor,footer:e.target.value})}/></label></div>
                <div className="email-editor-note"><PlayCircle size={15}/><span>Video emails use a clickable thumbnail fallback because many email clients do not reliably play embedded video.</span></div>
                <button className="primary-button" onClick={()=>void saveTemplate()} disabled={saving}><Save size={15}/>{saving ? "Saving..." : "Save template"}</button>
              </div>
              <div className="email-preview-side">
                <div className="email-preview-toolbar"><div><span className="eyebrow">Live preview</span><strong>{previewMode==="desktop" ? "Desktop" : "Mobile"}</strong></div><div><button className={previewMode==="desktop"?"icon-button active": "icon-button"} onClick={()=>setPreviewMode("desktop")}><Monitor size={15}/></button><button className={previewMode==="mobile"?"icon-button active": "icon-button"} onClick={()=>setPreviewMode("mobile")}><Smartphone size={15}/></button></div></div>
                <div className={previewMode==="mobile"?"email-preview-frame mobile":"email-preview-frame"}><iframe title="Email preview" srcDoc={previewHtml} /></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
