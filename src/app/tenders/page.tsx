"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import PriorityBadge from "@/components/ui/PriorityBadge";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

interface Tender {
  id: string;
  tender_number: string;
  title: string;
  client_name?: string;
  client_id?: string;
  stage: string;
  status: string;
  priority: string;
  tender_type: string;
  estimated_value: number;
  submission_deadline: string;
  site_visit_date: string;
  assigned_to: string;
  assigned_name?: string;
  checklist_total?: number;
  checklist_complete?: number;
}

interface TeamMember { id: string; name: string; }
interface Client { id: string; company_name: string; }

const STAGES = [
  { value: "prospect", label: "Prospect", color: "bg-gray-100 text-gray-700" },
  { value: "bid_preparation", label: "Bid Preparation", color: "bg-blue-100 text-blue-700" },
  { value: "submitted", label: "Submitted", color: "bg-indigo-100 text-indigo-700" },
  { value: "awarded", label: "Won", color: "bg-green-100 text-green-700" },
  { value: "closed", label: "Lost", color: "bg-red-100 text-red-700" },
];

const DEFAULT_CHECKLIST = [
  "Review tender documents and specifications",
  "Complete site visit and measurements",
  "Request supplier quotes - materials",
  "Request supplier quotes - switchboards/panels",
  "Calculate cable runs and quantities",
  "Prepare labour estimate",
  "Calculate plant/equipment costs",
  "Complete pricing schedule",
  "Prepare method statement",
  "Management review and sign-off",
  "Compile submission documents",
  "Submit tender",
];

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function daysUntil(d: string) {
  if (!d) return Infinity;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function deadlineColor(d: string) {
  const days = daysUntil(d);
  if (days <= 0) return "text-red-700 bg-red-50";
  if (days <= 3) return "text-red-600 bg-red-50";
  if (days <= 7) return "text-amber-600 bg-amber-50";
  return "text-green-600 bg-green-50";
}

export default function TendersPage() {
  const router = useRouter();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [view, setView] = useState<"list" | "board">("list");
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [automationResult, setAutomationResult] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", client_id: "", tender_type: "competitive", priority: "medium", source: "",
    contact_name: "", contact_email: "", contact_phone: "",
    site_address: "", site_city: "", site_state: "", site_zip: "",
    scope_of_work: "", estimated_value: "", issue_date: "", site_visit_date: "", submission_deadline: "",
    assigned_to: "",
  });
  const [checklist, setChecklist] = useState<string[]>([...DEFAULT_CHECKLIST]);
  const [newCheckItem, setNewCheckItem] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/tenders").then(r => r.json()),
      fetch("/api/team").then(r => r.json()),
      fetch("/api/clients").then(r => r.json()),
    ]).then(([t, tm, c]) => {
      setTenders(Array.isArray(t) ? t : []);
      setTeam(Array.isArray(tm) ? tm : []);
      setClients(Array.isArray(c) ? c : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = tenders.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.tender_number.toLowerCase().includes(search.toLowerCase()) && !(t.client_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (stageFilter && t.stage !== stageFilter) return false;
    if (assignedFilter && t.assigned_to !== assignedFilter) return false;
    return true;
  });

  const pipelineValue = (stage: string) => tenders.filter(t => t.stage === stage).reduce((s, t) => s + (t.estimated_value || 0), 0);
  const pipelineCount = (stage: string) => tenders.filter(t => t.stage === stage).length;

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimated_value: parseFloat(form.estimated_value) || 0,
          checklist: checklist.map((item, i) => ({ item, sort_order: i + 1 })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreate(false);
        router.push(`/tenders/${data.id}`);
      }
    } finally { setSubmitting(false); }
  };

  const runAutomations = async () => {
    const res = await fetch("/api/automations/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (res.ok) {
      const data = await res.json();
      setAutomationResult(`Automations complete: ${data.alerts_created || 0} alerts, ${data.follow_ups_created || 0} follow-ups created`);
      setTimeout(() => setAutomationResult(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {automationResult && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{automationResult}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenders & Bids</h1>
          <p className="text-sm text-gray-500">{tenders.length} tenders &middot; {fmt(tenders.reduce((s, t) => s + (t.estimated_value || 0), 0))} pipeline value</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={runAutomations}>Run Automations</Button>
          <Button variant="primary" onClick={() => setShowCreate(true)}>New Tender</Button>
        </div>
      </div>

      {/* Pipeline Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAGES.map(s => (
          <div key={s.value} onClick={() => setStageFilter(stageFilter === s.value ? "" : s.value)}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${stageFilter === s.value ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200" : "border-gray-100 bg-white hover:border-gray-200"}`}>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.color}`}>{s.label}</span>
            <p className="mt-2 text-2xl font-bold text-gray-900">{pipelineCount(s.value)}</p>
            <p className="text-xs text-gray-500">{fmt(pipelineValue(s.value))}</p>
          </div>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search tenders..." /></div>
        <Select value={priorityFilter} onChange={setPriorityFilter} options={[{value:"",label:"All Priority"},{value:"low",label:"Low"},{value:"medium",label:"Medium"},{value:"high",label:"High"},{value:"urgent",label:"Urgent"}]} />
        <Select value={assignedFilter} onChange={setAssignedFilter} options={[{value:"",label:"All Team"},...team.map(t => ({value:t.id,label:t.name}))]} />
        <div className="flex rounded-lg border border-gray-200">
          <button onClick={() => setView("list")} className={`px-3 py-1.5 text-sm font-medium ${view === "list" ? "bg-gray-100 text-gray-900" : "text-gray-500"}`}>List</button>
          <button onClick={() => setView("board")} className={`px-3 py-1.5 text-sm font-medium ${view === "board" ? "bg-gray-100 text-gray-900" : "text-gray-500"}`}>Board</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />)}</div>
      ) : view === "list" ? (
        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Tender #</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Title</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Client</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Stage</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Priority</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Est. Value</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Deadline</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">Checklist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">No tenders found</td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id} onClick={() => router.push(`/tenders/${t.id}`)} className="cursor-pointer hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-medium text-blue-600">{t.tender_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                    <td className="px-4 py-3 text-gray-600">{t.client_name || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.stage} size="sm" /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3 font-medium">{fmt(t.estimated_value)}</td>
                    <td className="px-4 py-3">
                      {t.submission_deadline ? (
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${deadlineColor(t.submission_deadline)}`}>
                          {fmtDate(t.submission_deadline)} ({daysUntil(t.submission_deadline) <= 0 ? "OVERDUE" : `${daysUntil(t.submission_deadline)}d`})
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-200">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${t.checklist_total ? ((t.checklist_complete || 0) / t.checklist_total) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{t.checklist_complete || 0}/{t.checklist_total || 0}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Board View */
        <div className="grid grid-cols-5 gap-4">
          {STAGES.map(stage => (
            <div key={stage.value} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                <span className="text-xs text-gray-500">{pipelineCount(stage.value)}</span>
              </div>
              {filtered.filter(t => t.stage === stage.value).map(t => (
                <div key={t.id} onClick={() => router.push(`/tenders/${t.id}`)}
                  className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-xs text-gray-400">{t.tender_number}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">{t.title}</p>
                  <p className="mt-1 text-xs text-gray-500">{t.client_name}</p>
                  <p className="mt-2 text-lg font-bold text-gray-900">{fmt(t.estimated_value)}</p>
                  {t.submission_deadline && !["awarded","closed"].includes(t.stage) && (
                    <p className={`mt-1 text-xs font-medium ${daysUntil(t.submission_deadline) <= 3 ? "text-red-600" : daysUntil(t.submission_deadline) <= 7 ? "text-amber-600" : "text-gray-500"}`}>
                      {daysUntil(t.submission_deadline) <= 0 ? "OVERDUE" : `${daysUntil(t.submission_deadline)} days left`}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <PriorityBadge priority={t.priority} />
                    {(t.checklist_total ?? 0) > 0 && (
                      <span className="text-xs text-gray-400">{t.checklist_complete || 0}/{t.checklist_total}</span>
                    )}
                  </div>
                </div>
              ))}
              {filtered.filter(t => t.stage === stage.value).length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">No tenders</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Tender Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Tender"
        footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={handleCreate} disabled={submitting || !form.title.trim()}>{submitting ? "Creating..." : "Create Tender"}</Button></>}>
        <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-2">
          {/* Basic Info */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Basic Information</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Client</label>
                  <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
                  <select value={form.tender_type} onChange={e => setForm({...form, tender_type: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="competitive">Competitive</option>
                    <option value="invited">Invited</option>
                    <option value="negotiated">Negotiated</option>
                    <option value="design_construct">Design & Construct</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Source</label>
                  <input value={form.source} onChange={e => setForm({...form, source: e.target.value})} placeholder="e.g. referral, tender board" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Contact</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Name</label><input value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Email</label><input value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Phone</label><input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
            </div>
          </div>

          {/* Site */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Site Location</h3>
            <div className="space-y-3">
              <input value={form.site_address} onChange={e => setForm({...form, site_address: e.target.value})} placeholder="Street address" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <div className="grid grid-cols-3 gap-3">
                <input value={form.site_city} onChange={e => setForm({...form, site_city: e.target.value})} placeholder="City" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <input value={form.site_state} onChange={e => setForm({...form, site_state: e.target.value})} placeholder="State" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <input value={form.site_zip} onChange={e => setForm({...form, site_zip: e.target.value})} placeholder="ZIP" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          </div>

          {/* Scope + Value */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Scope & Value</h3>
            <textarea value={form.scope_of_work} onChange={e => setForm({...form, scope_of_work: e.target.value})} rows={3} placeholder="Scope of work..." className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Estimated Value ($)</label>
              <input type="number" value={form.estimated_value} onChange={e => setForm({...form, estimated_value: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Key Dates</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Issue Date</label><input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Site Visit</label><input type="date" value={form.site_visit_date} onChange={e => setForm({...form, site_visit_date: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Submission Deadline</label><input type="date" value={form.submission_deadline} onChange={e => setForm({...form, submission_deadline: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
            </div>
          </div>

          {/* Assignment */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Assigned To</label>
            <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">Select team member...</option>
              {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Checklist */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Submission Checklist</h3>
            <div className="space-y-1.5">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="flex-1 text-sm text-gray-700">{i + 1}. {item}</span>
                  <button onClick={() => setChecklist(checklist.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} placeholder="Add checklist item..." onKeyDown={e => { if (e.key === "Enter" && newCheckItem.trim()) { setChecklist([...checklist, newCheckItem.trim()]); setNewCheckItem(""); } }}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <Button variant="secondary" onClick={() => { if (newCheckItem.trim()) { setChecklist([...checklist, newCheckItem.trim()]); setNewCheckItem(""); } }}>Add</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
