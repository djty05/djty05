"use client";

import React, { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";

// --- Types ---

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: string;
  action_type: string;
  action_config: string;
  is_active: number;
  last_run: string | null;
  run_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface AutomationLogEntry {
  id: string;
  rule_id: string;
  trigger_type: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

interface RunResult {
  success: boolean;
  rules_evaluated: number;
  actions_taken: number;
  results: { rule: string; action: string; count: number }[];
}

// --- Constants ---

const TRIGGER_TYPE_OPTIONS = [
  { value: "tender_deadline_approaching", label: "Tender Deadline Approaching" },
  { value: "tender_checklist_incomplete", label: "Checklist Incomplete Near Deadline" },
  { value: "quote_no_response", label: "Quote No Response" },
  { value: "invoice_overdue", label: "Invoice Overdue" },
  { value: "site_visit_approaching", label: "Site Visit Approaching" },
  { value: "job_completed", label: "Job Completed" },
  { value: "tender_won", label: "Tender Won" },
];

const TRIGGER_DISPLAY: Record<string, string> = {
  tender_deadline_approaching: "Tender Deadline Approaching",
  tender_checklist_incomplete: "Checklist Incomplete Near Deadline",
  quote_no_response: "Quote No Response",
  invoice_overdue: "Invoice Overdue",
  site_visit_approaching: "Site Visit Approaching",
  job_completed: "Job Completed",
  tender_won: "Tender Won",
};

const TRIGGER_BADGE: Record<string, string> = {
  tender_deadline_approaching: "Tender Deadline",
  tender_checklist_incomplete: "Checklist Incomplete",
  quote_no_response: "Quote No Response",
  invoice_overdue: "Invoice Overdue",
  site_visit_approaching: "Site Visit",
  job_completed: "Job Completed",
  tender_won: "Tender Won",
};

const ACTION_TYPE_OPTIONS = [
  { value: "create_alert", label: "Create Alert" },
  { value: "create_follow_up", label: "Create Follow-up" },
];

const ACTION_DISPLAY: Record<string, string> = {
  create_alert: "Creates Alert",
  create_follow_up: "Creates Follow-up",
};

const ALERT_TYPE_OPTIONS = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "urgent", label: "Urgent" },
  { value: "success", label: "Success" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

// --- Helpers ---

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseJsonSafe(str: string | null | undefined): Record<string, unknown> {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

// --- Trigger config field definitions ---

interface TriggerField {
  key: string;
  label: string;
  type: "number";
}

const TRIGGER_CONFIG_FIELDS: Record<string, TriggerField[]> = {
  tender_deadline_approaching: [{ key: "days_before", label: "Days Before Deadline", type: "number" }],
  tender_checklist_incomplete: [{ key: "days_before", label: "Days Before Deadline", type: "number" }],
  quote_no_response: [{ key: "days_after_sent", label: "Days After Sent", type: "number" }],
  invoice_overdue: [],
  site_visit_approaching: [{ key: "days_before", label: "Days Before Visit", type: "number" }],
  job_completed: [{ key: "days_after", label: "Days After Completion", type: "number" }],
  tender_won: [],
};

// --- Component ---

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTriggerType, setFormTriggerType] = useState("");
  const [formTriggerConfig, setFormTriggerConfig] = useState<Record<string, unknown>>({});
  const [formActionType, setFormActionType] = useState("");
  const [formActionConfig, setFormActionConfig] = useState<Record<string, unknown>>({});
  const [formActive, setFormActive] = useState(true);

  // Run all state
  const [running, setRunning] = useState(false);
  const [runBanner, setRunBanner] = useState<string | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/automations");
      if (!res.ok) throw new Error("Failed to fetch automation rules");
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    // Fetch logs from each rule's detail endpoint to collect recent activity
    try {
      const res = await fetch("/api/automations");
      if (!res.ok) return;
      const rulesData: AutomationRule[] = await res.json();
      const allLogs: AutomationLogEntry[] = [];

      for (const rule of rulesData.slice(0, 20)) {
        try {
          const detailRes = await fetch(`/api/automations/${rule.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            if (detail.logs && Array.isArray(detail.logs)) {
              allLogs.push(
                ...detail.logs.map((log: AutomationLogEntry) => ({
                  ...log,
                  _ruleName: rule.name,
                }))
              );
            }
          }
        } catch {
          // skip individual failures
        }
      }

      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(allLogs.slice(0, 50));
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchRules(), fetchLogs()]);
      setLoading(false);
    }
    load();
  }, [fetchRules, fetchLogs]);

  // --- Modal helpers ---

  function openNewRuleModal() {
    setEditingRule(null);
    setFormName("");
    setFormDescription("");
    setFormTriggerType("");
    setFormTriggerConfig({});
    setFormActionType("");
    setFormActionConfig({});
    setFormActive(true);
    setModalOpen(true);
  }

  function openEditRuleModal(rule: AutomationRule) {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDescription(rule.description || "");
    setFormTriggerType(rule.trigger_type);
    setFormTriggerConfig(parseJsonSafe(rule.trigger_config));
    setFormActionType(rule.action_type);
    setFormActionConfig(parseJsonSafe(rule.action_config));
    setFormActive(rule.is_active === 1);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingRule(null);
  }

  async function handleSave() {
    if (!formName.trim() || !formTriggerType || !formActionType) return;
    setSaving(true);

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      trigger_type: formTriggerType,
      trigger_config: formTriggerConfig,
      action_type: formActionType,
      action_config: formActionConfig,
      is_active: formActive ? 1 : 0,
    };

    try {
      const url = editingRule
        ? `/api/automations/${editingRule.id}`
        : "/api/automations";
      const method = editingRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save rule");
      }

      closeModal();
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(rule: AutomationRule) {
    const newActive = rule.is_active === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/automations/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (!res.ok) throw new Error("Failed to update rule");
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle rule");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rule");
      setDeletingId(null);
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  }

  async function handleRunAll() {
    setRunning(true);
    setRunBanner(null);
    try {
      const res = await fetch("/api/automations/run", { method: "POST" });
      if (!res.ok) throw new Error("Failed to run automations");
      const data: RunResult = await res.json();

      const alertsCreated = data.results
        .filter((r) => r.action === "create_alert")
        .reduce((sum, r) => sum + r.count, 0);
      const followUpsCreated = data.results
        .filter((r) => r.action === "create_follow_up")
        .reduce((sum, r) => sum + r.count, 0);

      setRunBanner(
        `Automation run complete: ${alertsCreated} alert${alertsCreated !== 1 ? "s" : ""} created, ${followUpsCreated} follow-up${followUpsCreated !== 1 ? "s" : ""} created`
      );

      await Promise.all([fetchRules(), fetchLogs()]);
    } catch (err) {
      setRunBanner(
        err instanceof Error ? err.message : "Failed to run automations"
      );
    } finally {
      setRunning(false);
      setTimeout(() => setRunBanner(null), 8000);
    }
  }

  // --- Render helpers ---

  function renderTriggerConfigFields() {
    const fields = TRIGGER_CONFIG_FIELDS[formTriggerType] ?? [];
    if (fields.length === 0) return null;

    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Trigger Configuration</label>
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs text-gray-500">{field.label}</label>
            <input
              type="number"
              min={0}
              value={(formTriggerConfig[field.key] as number) ?? ""}
              onChange={(e) =>
                setFormTriggerConfig((prev) => ({
                  ...prev,
                  [field.key]: e.target.value ? parseInt(e.target.value, 10) : "",
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        ))}
      </div>
    );
  }

  function renderActionConfigFields() {
    if (formActionType === "create_alert") {
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Action Configuration</label>
          <Select
            label="Alert Type"
            value={(formActionConfig.type as string) || ""}
            onChange={(val) =>
              setFormActionConfig((prev) => ({ ...prev, type: val }))
            }
            options={ALERT_TYPE_OPTIONS}
            placeholder="Select alert type"
          />
          <div>
            <label className="mb-1 block text-xs text-gray-500">Message</label>
            <input
              type="text"
              value={(formActionConfig.message as string) || ""}
              onChange={(e) =>
                setFormActionConfig((prev) => ({
                  ...prev,
                  message: e.target.value,
                }))
              }
              placeholder="Alert message"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      );
    }

    if (formActionType === "create_follow_up") {
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Action Configuration</label>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Title</label>
            <input
              type="text"
              value={(formActionConfig.title as string) || ""}
              onChange={(e) =>
                setFormActionConfig((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              placeholder="Follow-up title"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <Select
            label="Priority"
            value={(formActionConfig.priority as string) || ""}
            onChange={(val) =>
              setFormActionConfig((prev) => ({ ...prev, priority: val }))
            }
            options={PRIORITY_OPTIONS}
            placeholder="Select priority"
          />
        </div>
      );
    }

    return null;
  }

  // --- Log table columns ---

  const logColumns = [
    {
      key: "created_at",
      label: "Date",
      render: (value: unknown) => (
        <span className="text-xs text-gray-600">{formatDateTime(value as string)}</span>
      ),
    },
    {
      key: "_ruleName",
      label: "Rule Name",
      render: (value: unknown) => (
        <span className="font-medium text-gray-900">{(value as string) || "Unknown"}</span>
      ),
    },
    {
      key: "trigger_type",
      label: "Trigger",
      render: (value: unknown) => (
        <StatusBadge status={TRIGGER_BADGE[value as string] || (value as string)} size="sm" />
      ),
    },
    {
      key: "action_type",
      label: "Action",
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">{ACTION_DISPLAY[value as string] || (value as string)}</span>
      ),
    },
    {
      key: "details",
      label: "Details",
      render: (value: unknown) => {
        const parsed = parseJsonSafe(value as string);
        return (
          <span className="text-xs text-gray-500">
            {parsed.matches ? `${parsed.matches} match${(parsed.matches as number) !== 1 ? "es" : ""}` : "—"}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value: unknown) => <StatusBadge status={value as string} size="sm" />,
    },
  ];

  // --- Main render ---

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
            <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  if (error && rules.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automated rules to catch missed items, deadlines, and follow-ups
          </p>
        </div>
        <Card>
          <EmptyState
            title="Error loading automations"
            description={error}
            action={
              <Button onClick={() => { setError(null); setLoading(true); fetchRules().then(() => setLoading(false)); }}>
                Retry
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      {runBanner && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          <span>{runBanner}</span>
          <button
            onClick={() => setRunBanner(null)}
            className="ml-auto rounded p-1 text-blue-500 hover:bg-blue-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automated rules to catch missed items, deadlines, and follow-ups
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleRunAll} disabled={running}>
            {running ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
                Run All Now
              </>
            )}
          </Button>
          <Button onClick={openNewRuleModal} icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }>
            New Rule
          </Button>
        </div>
      </div>

      {/* Active Automations */}
      {rules.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            }
            title="No automation rules"
            description="Create your first automation rule to automatically catch missed items and deadlines."
            action={<Button onClick={openNewRuleModal}>Create Rule</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => {
            const triggerConfig = parseJsonSafe(rule.trigger_config);
            const actionConfig = parseJsonSafe(rule.action_config);
            const isActive = rule.is_active === 1;

            return (
              <Card key={rule.id} className={`flex flex-col ${!isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-900 leading-snug">{rule.name}</h3>
                  {/* Toggle switch */}
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      isActive ? "bg-blue-600" : "bg-gray-300"
                    }`}
                    role="switch"
                    aria-checked={isActive}
                    aria-label={isActive ? "Deactivate rule" : "Activate rule"}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        isActive ? "translate-x-[18px]" : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </div>

                {rule.description && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{rule.description}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {TRIGGER_BADGE[rule.trigger_type] || rule.trigger_type}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {ACTION_DISPLAY[rule.action_type] || rule.action_type}
                  </span>
                </div>

                {/* Config summary */}
                {Object.keys(triggerConfig).length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    {Object.entries(triggerConfig).map(([key, val]) => (
                      <span key={key}>
                        {key.replace(/_/g, " ")}: {String(val)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center gap-4 border-t border-gray-100 pt-3 mt-3">
                  <div className="flex-1 text-xs text-gray-500">
                    <div>Last run: {formatDateTime(rule.last_run)}</div>
                    <div>Run count: {rule.run_count}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditRuleModal(rule)}
                    icon={
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingId(rule.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    icon={
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    }
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent Activity Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
        {logs.length === 0 ? (
          <Card>
            <EmptyState
              title="No recent activity"
              description="Automation activity logs will appear here after rules are executed."
            />
          </Card>
        ) : (
          <DataTable
            columns={logColumns}
            data={logs as unknown as Record<string, unknown>[]}
            emptyMessage="No recent activity"
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Automation Rule"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deletingId && handleDelete(deletingId)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete this automation rule? This action cannot be undone.
        </p>
      </Modal>

      {/* New / Edit Rule Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingRule ? "Edit Automation Rule" : "New Automation Rule"}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName.trim() || !formTriggerType || !formActionType}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Rule name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What does this rule do?"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Trigger Type */}
          <Select
            label="Trigger Type"
            value={formTriggerType}
            onChange={(val) => {
              setFormTriggerType(val);
              setFormTriggerConfig({});
            }}
            options={TRIGGER_TYPE_OPTIONS}
            placeholder="Select a trigger"
          />

          {/* Trigger Config */}
          {formTriggerType && renderTriggerConfigFields()}

          {/* Action Type */}
          <Select
            label="Action Type"
            value={formActionType}
            onChange={(val) => {
              setFormActionType(val);
              setFormActionConfig({});
            }}
            options={ACTION_TYPE_OPTIONS}
            placeholder="Select an action"
          />

          {/* Action Config */}
          {formActionType && renderActionConfigFields()}

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormActive((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                formActive ? "bg-blue-600" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={formActive}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  formActive ? "translate-x-[22px]" : "translate-x-[3px]"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {formActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
