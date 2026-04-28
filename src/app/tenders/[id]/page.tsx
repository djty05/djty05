"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import PriorityBadge from "@/components/ui/PriorityBadge";
import Modal from "@/components/ui/Modal";

interface ChecklistItem { id?: string; item: string; is_complete: number; completed_by?: string; completed_at?: string; due_date?: string; sort_order: number; }
interface TenderItem { id?: string; description: string; category: string; quantity: number; unit: string; unit_cost: number; markup_percent: number; total: number; sort_order: number; }
interface FollowUp { id: string; title: string; description: string; due_date: string; status: string; priority: string; assigned_to?: string; }
interface Tender {
  id: string; tender_number: string; title: string; description: string; client_id: string;
  status: string; stage: string; priority: string; tender_type: string; source: string;
  estimated_value: number; submitted_value: number; margin_percent: number;
  issue_date: string; site_visit_date: string; submission_deadline: string; decision_date: string; awarded_date: string;
  lost_reason: string; contact_name: string; contact_email: string; contact_phone: string;
  site_address: string; site_city: string; site_state: string; site_zip: string;
  scope_of_work: string; notes: string; assigned_to: string; job_id: string;
  client_name?: string; assigned_name?: string;
  checklist: ChecklistItem[]; items: TenderItem[]; follow_ups: FollowUp[];
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

type Tab = "overview" | "checklist" | "pricing" | "follow_ups";

export default function TenderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [showWonModal, setShowWonModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [lostNotes, setLostNotes] = useState("");
  const [submittedValue, setSubmittedValue] = useState("");
  const [savingItems, setSavingItems] = useState(false);
  const [items, setItems] = useState<TenderItem[]>([]);
  const [fuForm, setFuForm] = useState({ title: "", description: "", due_date: "", priority: "medium" });

  const fetchTender = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTender(data);
        setItems(data.items || []);
      }
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchTender(); }, [fetchTender]);

  const updateStatus = async (updates: Record<string, unknown>) => {
    await fetch(`/api/tenders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    fetchTender();
  };

  const toggleChecklist = async (index: number) => {
    if (!tender) return;
    const updated = tender.checklist.map((c, i) => i === index ? { ...c, is_complete: c.is_complete ? 0 : 1, completed_at: c.is_complete ? "" : new Date().toISOString() } : c);
    await fetch(`/api/tenders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checklist: updated }) });
    fetchTender();
  };

  const saveItems = async () => {
    setSavingItems(true);
    await fetch(`/api/tenders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    setSavingItems(false);
    fetchTender();
  };

  const addFollowUp = async () => {
    await fetch("/api/follow-ups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fuForm, entity_type: "tender", entity_id: id, assigned_to: tender?.assigned_to }) });
    setShowFollowUpModal(false);
    setFuForm({ title: "", description: "", due_date: "", priority: "medium" });
    fetchTender();
  };

  const completeFollowUp = async (fuId: string) => {
    await fetch(`/api/follow-ups/${fuId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) });
    fetchTender();
  };

  if (loading) return <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" /></div>;
  if (!tender) return <div className="py-16 text-center text-gray-500">Tender not found</div>;

  const checkComplete = tender.checklist.filter(c => c.is_complete).length;
  const checkTotal = tender.checklist.length;
  const daysLeft = tender.submission_deadline ? Math.ceil((new Date(tender.submission_deadline).getTime() - Date.now()) / 86400000) : null;

  const categoryTotals = items.reduce((acc, item) => {
    const cat = item.category || "general";
    acc[cat] = (acc[cat] || 0) + (item.quantity * item.unit_cost * (1 + item.markup_percent / 100));
    return acc;
  }, {} as Record<string, number>);
  const grandTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "checklist", label: `Checklist (${checkComplete}/${checkTotal})` },
    { key: "pricing", label: "Pricing" },
    { key: "follow_ups", label: `Follow-ups (${(tender.follow_ups || []).filter(f => f.status === "pending").length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/tenders")} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{tender.tender_number}</span>
              <StatusBadge status={tender.stage} />
              <PriorityBadge priority={tender.priority} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{tender.title}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {tender.stage === "prospect" && <Button variant="primary" onClick={() => updateStatus({ stage: "bid_preparation", status: "in_progress" })}>Start Bid Prep</Button>}
          {tender.stage === "bid_preparation" && <Button variant="primary" onClick={() => setShowSubmittedModal(true)}>Mark Submitted</Button>}
          {tender.stage === "submitted" && <>
            <Button variant="primary" onClick={() => setShowWonModal(true)}>Won</Button>
            <Button variant="danger" onClick={() => setShowLostModal(true)}>Lost</Button>
          </>}
          {tender.stage === "awarded" && !tender.job_id && <Button variant="primary" onClick={() => router.push("/jobs/create")}>Create Job</Button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`border-b-2 pb-3 pt-2 text-sm font-medium transition-colors ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}>{t.label}</button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Tender Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Type:</span> <span className="ml-2 capitalize text-gray-900">{tender.tender_type?.replace(/_/g, " ")}</span></div>
                <div><span className="text-gray-500">Source:</span> <span className="ml-2 text-gray-900">{tender.source || "—"}</span></div>
                <div><span className="text-gray-500">Estimated Value:</span> <span className="ml-2 font-semibold text-gray-900">{fmt(tender.estimated_value)}</span></div>
                <div><span className="text-gray-500">Submitted Value:</span> <span className="ml-2 font-semibold text-gray-900">{tender.submitted_value ? fmt(tender.submitted_value) : "—"}</span></div>
              </div>
            </Card>
            {tender.scope_of_work && (
              <Card>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Scope of Work</h3>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{tender.scope_of_work}</p>
              </Card>
            )}
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Key Dates</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Issue Date:</span> <span className="ml-2">{fmtDate(tender.issue_date)}</span></div>
                <div><span className="text-gray-500">Site Visit:</span> <span className="ml-2">{fmtDate(tender.site_visit_date)}</span></div>
                <div>
                  <span className="text-gray-500">Submission Deadline:</span>
                  <span className={`ml-2 font-semibold ${daysLeft !== null && daysLeft <= 3 ? "text-red-600" : daysLeft !== null && daysLeft <= 7 ? "text-amber-600" : "text-gray-900"}`}>
                    {fmtDate(tender.submission_deadline)}
                    {daysLeft !== null && !["awarded", "closed"].includes(tender.stage) && (
                      <span className="ml-1 text-xs">({daysLeft <= 0 ? "OVERDUE" : `${daysLeft} days left`})</span>
                    )}
                  </span>
                </div>
                <div><span className="text-gray-500">Decision Date:</span> <span className="ml-2">{fmtDate(tender.decision_date)}</span></div>
                {tender.awarded_date && <div><span className="text-gray-500">Awarded:</span> <span className="ml-2 font-semibold text-green-600">{fmtDate(tender.awarded_date)}</span></div>}
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Client</h3>
              <p className="font-medium text-gray-900">{tender.client_name || "—"}</p>
              <p className="text-sm text-gray-600">{tender.contact_name}</p>
              {tender.contact_email && <p className="text-sm text-blue-600">{tender.contact_email}</p>}
              {tender.contact_phone && <p className="text-sm text-gray-600">{tender.contact_phone}</p>}
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Site Location</h3>
              <p className="text-sm text-gray-700">{[tender.site_address, tender.site_city, tender.site_state].filter(Boolean).join(", ") || "—"}</p>
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Checklist Progress</h3>
              <div className="mb-2 h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${checkTotal ? (checkComplete / checkTotal) * 100 : 0}%` }} />
              </div>
              <p className="text-sm text-gray-600">{checkComplete} of {checkTotal} items complete</p>
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Pricing Summary</h3>
              <p className="text-2xl font-bold text-gray-900">{fmt(grandTotal)}</p>
              <p className="text-sm text-gray-500">{items.length} line items</p>
            </Card>
          </div>
        </div>
      )}

      {/* Checklist Tab */}
      {tab === "checklist" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="mb-2 h-2 w-48 rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${checkTotal ? (checkComplete / checkTotal) * 100 : 0}%` }} />
              </div>
              <p className="text-sm text-gray-600">{checkComplete} of {checkTotal} complete</p>
            </div>
          </div>
          <div className="space-y-1">
            {tender.checklist.map((item, i) => {
              const overdue = item.due_date && !item.is_complete && new Date(item.due_date) < new Date();
              return (
                <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${overdue ? "bg-red-50" : item.is_complete ? "bg-green-50/50" : "hover:bg-gray-50"}`}>
                  <button onClick={() => toggleChecklist(i)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${item.is_complete ? "border-green-500 bg-green-500 text-white" : "border-gray-300 hover:border-blue-400"}`}>
                    {item.is_complete && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </button>
                  <span className={`flex-1 text-sm ${item.is_complete ? "text-gray-400 line-through" : "text-gray-900"}`}>{item.item}</span>
                  {item.due_date && <span className={`text-xs ${overdue ? "font-medium text-red-600" : "text-gray-400"}`}>{fmtDate(item.due_date)}</span>}
                  {item.is_complete && item.completed_at && <span className="text-xs text-green-600">{fmtDate(item.completed_at)}</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Pricing Tab */}
      {tab === "pricing" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setItems([...items, { description: "", category: "materials", quantity: 1, unit: "each", unit_cost: 0, markup_percent: 20, total: 0, sort_order: items.length + 1 }])}>Add Row</Button>
              <Button onClick={saveItems} disabled={savingItems}>{savingItems ? "Saving..." : "Save Pricing"}</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Category</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Unit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Unit Cost</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Markup %</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, i) => {
                  const lineTotal = item.quantity * item.unit_cost * (1 + item.markup_percent / 100);
                  return (
                    <tr key={i}>
                      <td className="px-3 py-1.5"><input value={item.description} onChange={e => { const n = [...items]; n[i] = { ...n[i], description: e.target.value }; setItems(n); }} className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none" /></td>
                      <td className="px-3 py-1.5">
                        <select value={item.category} onChange={e => { const n = [...items]; n[i] = { ...n[i], category: e.target.value }; setItems(n); }} className="rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none">
                          <option value="materials">Materials</option><option value="labour">Labour</option><option value="equipment">Equipment</option><option value="overhead">Overhead</option><option value="subcontractor">Subcontractor</option>
                        </select>
                      </td>
                      <td className="px-3 py-1.5"><input type="number" value={item.quantity} onChange={e => { const n = [...items]; n[i] = { ...n[i], quantity: parseFloat(e.target.value) || 0 }; setItems(n); }} className="w-16 rounded border border-gray-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none" /></td>
                      <td className="px-3 py-1.5"><input value={item.unit} onChange={e => { const n = [...items]; n[i] = { ...n[i], unit: e.target.value }; setItems(n); }} className="w-16 rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none" /></td>
                      <td className="px-3 py-1.5"><input type="number" value={item.unit_cost} onChange={e => { const n = [...items]; n[i] = { ...n[i], unit_cost: parseFloat(e.target.value) || 0 }; setItems(n); }} className="w-24 rounded border border-gray-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none" /></td>
                      <td className="px-3 py-1.5"><input type="number" value={item.markup_percent} onChange={e => { const n = [...items]; n[i] = { ...n[i], markup_percent: parseFloat(e.target.value) || 0 }; setItems(n); }} className="w-16 rounded border border-gray-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none" /></td>
                      <td className="px-3 py-1.5 text-right font-medium">{fmt(lineTotal)}</td>
                      <td className="px-3 py-1.5"><button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Summary */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                {Object.entries(categoryTotals).map(([cat, total]) => (
                  <div key={cat} className="flex justify-between"><span className="capitalize text-gray-500">{cat}</span><span className="font-medium">{fmt(total)}</span></div>
                ))}
                <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Grand Total</span><span>{fmt(grandTotal)}</span></div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Follow-ups Tab */}
      {tab === "follow_ups" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowFollowUpModal(true)}>Add Follow-up</Button>
          </div>
          {(tender.follow_ups || []).length === 0 ? (
            <Card><p className="py-8 text-center text-sm text-gray-500">No follow-ups yet</p></Card>
          ) : (
            <div className="space-y-3">
              {tender.follow_ups.map(fu => {
                const overdue = fu.status === "pending" && fu.due_date && new Date(fu.due_date) < new Date();
                return (
                  <Card key={fu.id}>
                    <div className={`flex items-center justify-between ${overdue ? "text-red-700" : ""}`}>
                      <div>
                        <p className="font-medium text-gray-900">{fu.title}</p>
                        {fu.description && <p className="mt-1 text-sm text-gray-600">{fu.description}</p>}
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <StatusBadge status={fu.status} size="sm" />
                          <span>Due: {fmtDate(fu.due_date)}</span>
                          <PriorityBadge priority={fu.priority} />
                        </div>
                      </div>
                      {fu.status === "pending" && (
                        <Button variant="secondary" onClick={() => completeFollowUp(fu.id)}>Complete</Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Won Modal */}
      <Modal isOpen={showWonModal} onClose={() => setShowWonModal(false)} title="Mark Tender as Won"
        footer={<><Button variant="secondary" onClick={() => setShowWonModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { updateStatus({ status: "won", stage: "awarded", awarded_date: new Date().toISOString().split("T")[0] }); setShowWonModal(false); }}>Confirm Won</Button></>}>
        <p className="text-sm text-gray-600">This will mark <strong>{tender.tender_number}</strong> as won and record today as the awarded date.</p>
      </Modal>

      {/* Lost Modal */}
      <Modal isOpen={showLostModal} onClose={() => setShowLostModal(false)} title="Mark Tender as Lost"
        footer={<><Button variant="secondary" onClick={() => setShowLostModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { if (lostReason) { updateStatus({ status: "lost", stage: "closed", lost_reason: lostReason, notes: lostNotes }); setShowLostModal(false); } }} disabled={!lostReason}>Confirm Lost</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason *</label>
            <select value={lostReason} onChange={e => setLostReason(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">Select reason...</option>
              <option value="price">Price Too High</option><option value="scope">Scope Mismatch</option><option value="competitor">Competitor Selected</option>
              <option value="timing">Timing</option><option value="relationship">Relationship</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea value={lostNotes} onChange={e => setLostNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
      </Modal>

      {/* Submitted Modal */}
      <Modal isOpen={showSubmittedModal} onClose={() => setShowSubmittedModal(false)} title="Mark as Submitted"
        footer={<><Button variant="secondary" onClick={() => setShowSubmittedModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { updateStatus({ status: "submitted", stage: "submitted", submitted_value: parseFloat(submittedValue) || 0 }); setShowSubmittedModal(false); }}>Confirm Submission</Button></>}>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Submitted Value ($)</label>
          <input type="number" value={submittedValue} onChange={e => setSubmittedValue(e.target.value)} placeholder="Enter final submitted value" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </Modal>

      {/* Follow-up Modal */}
      <Modal isOpen={showFollowUpModal} onClose={() => setShowFollowUpModal(false)} title="Add Follow-up"
        footer={<><Button variant="secondary" onClick={() => setShowFollowUpModal(false)}>Cancel</Button>
          <Button onClick={addFollowUp} disabled={!fuForm.title.trim()}>Create</Button></>}>
        <div className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-gray-700">Title *</label><input value={fuForm.title} onChange={e => setFuForm({...fuForm, title: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
          <div><label className="mb-1 block text-sm font-medium text-gray-700">Description</label><textarea value={fuForm.description} onChange={e => setFuForm({...fuForm, description: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label><input type="date" value={fuForm.due_date} onChange={e => setFuForm({...fuForm, due_date: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Priority</label><select value={fuForm.priority} onChange={e => setFuForm({...fuForm, priority: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
