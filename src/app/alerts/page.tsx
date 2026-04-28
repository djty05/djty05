"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

// --- Types ---

interface Alert {
  id: string;
  user_id: string | null;
  title: string;
  message: string | null;
  type: string; // info | warning | urgent | success
  entity_type: string | null;
  entity_id: string | null;
  is_read: number;
  action_url: string | null;
  created_at: string;
  [key: string]: unknown;
}

type FilterType = "all" | "unread" | "urgent" | "warning" | "info" | "success";

// --- Constants ---

const TYPE_COLORS: Record<string, { dot: string; bg: string; border: string; text: string }> = {
  urgent: { dot: "bg-red-500", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  info: { dot: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  success: { dot: "bg-green-500", bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
};

const FILTER_PILLS: { key: FilterType; label: string; color?: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "urgent", label: "Urgent", color: "text-red-600" },
  { key: "warning", label: "Warning", color: "text-amber-600" },
  { key: "info", label: "Info", color: "text-blue-600" },
  { key: "success", label: "Success", color: "text-green-600" },
];

// --- Helpers ---

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) !== 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDay / 30)} month${Math.floor(diffDay / 30) !== 1 ? "s" : ""} ago`;
}

function getDateGroup(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);

  if (date >= todayStart) return "Today";
  if (date >= yesterdayStart) return "Yesterday";
  if (date >= weekStart) return "This Week";
  return "Older";
}

function groupByDate(alerts: Alert[]): { group: string; alerts: Alert[] }[] {
  const order = ["Today", "Yesterday", "This Week", "Older"];
  const grouped: Record<string, Alert[]> = {};

  for (const alert of alerts) {
    const group = getDateGroup(alert.created_at);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(alert);
  }

  return order
    .filter((g) => grouped[g] && grouped[g].length > 0)
    .map((g) => ({ group: g, alerts: grouped[g] }));
}

// --- Component ---

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("unread");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [markingReadIds, setMarkingReadIds] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      // For "unread" filter, use the is_read query param
      // For type filters, use type param
      // For "all", fetch everything
      let url = "/api/alerts?";
      if (filter === "unread") {
        url += "is_read=0";
      } else if (filter === "urgent" || filter === "warning" || filter === "info" || filter === "success") {
        url += `type=${filter}`;
      }
      // "all" = no filter params

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchAlerts().finally(() => setLoading(false));
  }, [fetchAlerts]);

  async function handleMarkAllRead() {
    setMarkingAllRead(true);
    try {
      // The mark-all-read endpoint requires user_id. We'll pass a general approach.
      // Since this is a demo app, we'll update each unread alert individually
      const unread = alerts.filter((a) => a.is_read === 0);
      await Promise.all(
        unread.map((a) =>
          fetch(`/api/alerts/${a.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_read: 1 }),
          })
        )
      );
      await fetchAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all as read");
    } finally {
      setMarkingAllRead(false);
    }
  }

  async function handleMarkRead(id: string) {
    setMarkingReadIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: 1 }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      // Update local state
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: 1 } : a))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as read");
    } finally {
      setMarkingReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDismiss(id: string) {
    setDismissingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to dismiss alert");
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss alert");
    } finally {
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const grouped = useMemo(() => groupByDate(alerts), [alerts]);
  const unreadCount = useMemo(() => alerts.filter((a) => a.is_read === 0).length, [alerts]);

  // --- Render ---

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-gray-100" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto rounded p-1 text-red-500 hover:bg-red-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts & Notifications</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={handleMarkAllRead}
          disabled={markingAllRead || unreadCount === 0}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          {markingAllRead ? "Marking..." : "Mark All Read"}
        </Button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_PILLS.map((pill) => {
          const isSelected = filter === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? pill.color
                    ? `${TYPE_COLORS[pill.key]?.bg || "bg-gray-900"} ${TYPE_COLORS[pill.key]?.text || "text-white"} ${TYPE_COLORS[pill.key]?.border || "border-gray-900"} border`
                    : "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            }
            title={filter === "unread" ? "No unread alerts" : "No alerts found"}
            description={
              filter === "unread"
                ? "You're all caught up! No unread notifications."
                : "No alerts match the current filter."
            }
            action={
              filter !== "all" ? (
                <Button variant="secondary" onClick={() => setFilter("all")}>
                  View All Alerts
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ group, alerts: groupAlerts }) => (
            <div key={group}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                {group}
              </h3>
              <div className="space-y-2">
                {groupAlerts.map((alert) => {
                  const colors = TYPE_COLORS[alert.type] || TYPE_COLORS.info;
                  const isUnread = alert.is_read === 0;
                  const isDismissing = dismissingIds.has(alert.id);
                  const isMarkingRead = markingReadIds.has(alert.id);

                  return (
                    <div
                      key={alert.id}
                      className={`group relative rounded-xl border bg-white p-4 transition-all hover:shadow-sm ${
                        isUnread ? "border-l-4 " + colors.border : "border-gray-100"
                      } ${isDismissing ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Type icon */}
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
                          <span className={`h-3 w-3 rounded-full ${colors.dot}`} />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <h4 className={`text-sm leading-snug ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                              {isUnread && (
                                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-500" />
                              )}
                              {alert.title}
                            </h4>
                            <span className="shrink-0 text-xs text-gray-400">
                              {timeAgo(alert.created_at)}
                            </span>
                          </div>

                          {alert.message && (
                            <p className="mt-1 text-sm text-gray-500">{alert.message}</p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {alert.action_url && (
                              <Link
                                href={alert.action_url}
                                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                                View {alert.entity_type || "Details"}
                              </Link>
                            )}

                            {isUnread && (
                              <button
                                onClick={() => handleMarkRead(alert.id)}
                                disabled={isMarkingRead}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                {isMarkingRead ? "Marking..." : "Mark as Read"}
                              </button>
                            )}

                            <button
                              onClick={() => handleDismiss(alert.id)}
                              disabled={isDismissing}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              {isDismissing ? "Dismissing..." : "Dismiss"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
