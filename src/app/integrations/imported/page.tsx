"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ImportedTender {
  id: string;
  external_id: string | null;
  provider: string;
  external_number: string | null;
  title: string;
  description: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  location: string | null;
  state: string | null;
  category: string | null;
  trade: string | null;
  estimated_value: number | null;
  closing_date: string | null;
  site_visit_date: string | null;
  documents_url: string | null;
  source_url: string | null;
  keywords_matched: string | null;
  decision: string;
  decision_reason: string | null;
  decision_date: string | null;
  decision_by: string | null;
  tender_id: string | null;
  is_archived: number;
  imported_at: string;
}

interface Digest {
  id: string;
  digest_date: string;
  total_new: number;
  total_vic: number;
  total_electrical: number;
  pending_decisions: number;
  summary: string;
  pending_tenders: ImportedTender[];
}

export default function ImportedTendersPage() {
  const [tenders, setTenders] = useState<ImportedTender[]>([]);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "quoted" | "declined" | "all">("pending");
  const [search, setSearch] = useState("");
  const [decisionModal, setDecisionModal] = useState<ImportedTender | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [converting, setConverting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [generatingDigest, setGeneratingDigest] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("decision", filter);
      if (search) params.set("search", search);

      const [tendersRes, digestRes] = await Promise.all([
        fetch(`/api/imported-tenders?${params}`),
        fetch("/api/morning-digest"),
      ]);

      if (tendersRes.ok) setTenders(await tendersRes.json());
      if (digestRes.ok) setDigest(await digestRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDecision = async (id: string, decision: "quoted" | "declined") => {
    if (decision === "quoted") {
      setConverting(id);
      try {
        const res = await fetch(`/api/imported-tenders/${id}/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (res.ok) {
          setMessage({
            type: "success",
            text: `Converted to tender ${data.tender_number || ""}. Checklist created.`,
          });
          setDecisionModal(null);
          await fetchData();
        } else {
          setMessage({ type: "error", text: data.error || "Failed to convert" });
        }
      } catch {
        setMessage({ type: "error", text: "Conversion failed" });
      } finally {
        setConverting(null);
      }
    } else {
      try {
        const res = await fetch(`/api/imported-tenders/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: "declined",
            decision_reason: decisionReason || null,
          }),
        });
        if (res.ok) {
          setMessage({ type: "success", text: "Tender declined" });
          setDecisionModal(null);
          setDecisionReason("");
          await fetchData();
        }
      } catch {
        setMessage({ type: "error", text: "Failed to update" });
      }
    }
  };

  const generateDigest = async () => {
    setGeneratingDigest(true);
    try {
      const res = await fetch("/api/morning-digest", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDigest(data);
        setMessage({ type: "success", text: "Morning digest generated" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to generate digest" });
    } finally {
      setGeneratingDigest(false);
    }
  };

  const formatCurrency = (val: number | null) => {
    if (!val) return "TBD";
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  };

  const daysUntil = (iso: string | null) => {
    if (!iso) return null;
    const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
    return diff;
  };

  const pendingCount = tenders.filter((t) => t.decision === "pending").length;
  const quotedCount = tenders.filter((t) => t.decision === "quoted").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Morning Digest Banner */}
      {digest && digest.summary && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-900">Morning Digest — {digest.digest_date}</h3>
                <p className="mt-1 text-sm text-amber-800">{digest.summary}</p>
                <div className="mt-2 flex gap-4 text-xs text-amber-700">
                  <span>{digest.total_new} new electrical</span>
                  <span>{digest.total_vic} total VIC</span>
                  <span className="font-semibold">{digest.pending_decisions} awaiting decision</span>
                </div>
              </div>
            </div>
            <button
              onClick={generateDigest}
              disabled={generatingDigest}
              className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              {generatingDigest ? "Generating..." : "Refresh Digest"}
            </button>
          </div>
        </div>
      )}

      {!digest && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-sm text-gray-500">No morning digest yet.</p>
          <button
            onClick={generateDigest}
            disabled={generatingDigest}
            className="mt-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {generatingDigest ? "Generating..." : "Generate Morning Digest"}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Imported Tenders</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and decide on tenders from EstimateOne and other sources
          </p>
        </div>
        <Link
          href="/integrations"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          &larr; Back to Integrations
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 bg-white">
          {(
            [
              { key: "pending", label: "Pending", count: pendingCount },
              { key: "quoted", label: "Quoted", count: quotedCount },
              { key: "declined", label: "Declined" },
              { key: "all", label: "All" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              } ${tab.key !== "pending" ? "border-l border-gray-200" : ""}`}
            >
              {tab.label}
              {"count" in tab && tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tenders..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Tender Cards */}
      {tenders.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto h-12 w-12 text-gray-300">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No imported tenders found</p>
          <p className="mt-1 text-xs text-gray-400">
            Sync your EstimateOne account to start importing tenders
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map((tender) => {
            const days = daysUntil(tender.closing_date);
            const urgent = days !== null && days <= 3;
            const warning = days !== null && days > 3 && days <= 7;

            return (
              <div
                key={tender.id}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
                  urgent ? "border-red-200" : warning ? "border-amber-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between p-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{tender.title}</h3>
                      {tender.provider && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                          {tender.provider}
                        </span>
                      )}
                      {tender.decision === "pending" && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          Awaiting Decision
                        </span>
                      )}
                      {tender.decision === "quoted" && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Quoted
                        </span>
                      )}
                      {tender.decision === "declined" && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Declined
                        </span>
                      )}
                    </div>

                    {tender.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">{tender.description}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
                      {tender.client_name && (
                        <span className="flex items-center gap-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          {tender.client_name}
                        </span>
                      )}
                      {tender.location && (
                        <span className="flex items-center gap-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {tender.location}{tender.state ? `, ${tender.state}` : ""}
                        </span>
                      )}
                      {tender.trade && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{tender.trade}</span>}
                      {tender.keywords_matched && (
                        <span className="text-orange-600">
                          Keywords: {tender.keywords_matched}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-6 flex shrink-0 flex-col items-end gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(tender.estimated_value)}
                    </span>
                    {tender.closing_date && (
                      <span
                        className={`text-xs font-medium ${
                          urgent ? "text-red-600" : warning ? "text-amber-600" : "text-gray-500"
                        }`}
                      >
                        {urgent
                          ? `${days}d left!`
                          : warning
                          ? `${days}d left`
                          : `Closes ${formatDate(tender.closing_date)}`}
                      </span>
                    )}
                    {tender.site_visit_date && (
                      <span className="text-xs text-gray-400">
                        Site visit: {formatDate(tender.site_visit_date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Bar */}
                {tender.decision === "pending" && (
                  <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-3">
                    <span className="text-xs text-gray-400">
                      Imported {formatDate(tender.imported_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDecisionModal(tender);
                          setDecisionReason("");
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        No Quote
                      </button>
                      <button
                        onClick={() => handleDecision(tender.id, "quoted")}
                        disabled={converting === tender.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        {converting === tender.id ? (
                          <>
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                              <path d="M9 11l3 3L22 4" />
                            </svg>
                            Quote This
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {tender.decision === "quoted" && tender.tender_id && (
                  <div className="flex items-center justify-between border-t border-green-100 bg-green-50 px-5 py-3">
                    <span className="text-xs text-green-700">
                      Converted to tender on {formatDate(tender.decision_date)}
                    </span>
                    <Link
                      href={`/tenders/${tender.tender_id}`}
                      className="text-sm font-medium text-green-700 hover:text-green-800"
                    >
                      View Tender &rarr;
                    </Link>
                  </div>
                )}

                {tender.decision === "declined" && (
                  <div className="flex items-center justify-between border-t border-red-100 bg-red-50 px-5 py-3">
                    <span className="text-xs text-red-600">
                      Declined on {formatDate(tender.decision_date)}
                      {tender.decision_reason && ` — ${tender.decision_reason}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Decline Tender</h3>
            <p className="mt-1 text-sm text-gray-500">
              Are you sure you don&apos;t want to quote on &ldquo;{decisionModal.title}&rdquo;?
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reason (optional)
              </label>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Too far away, not our scope, too small, capacity issues..."
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDecisionModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision(decisionModal.id, "declined")}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
