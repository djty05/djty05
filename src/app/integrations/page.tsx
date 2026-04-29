"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface IntegrationLog {
  id: string;
  provider: string;
  action: string;
  status: string;
  details: string;
  items_processed: number;
  created_at: string;
}

interface Integration {
  id: string;
  provider: string;
  is_enabled: number;
  api_url: string | null;
  api_key: string | null;
  api_secret: string | null;
  username: string | null;
  password: string | null;
  extra_config: string;
  last_sync: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
  recent_logs: IntegrationLog[];
}

const PROVIDER_INFO: Record<
  string,
  { label: string; description: string; color: string; icon: React.ReactNode }
> = {
  estimateone: {
    label: "EstimateOne",
    description:
      "Pull tender requests automatically. Scan for electrical keywords and filter by state. Get morning updates with new VIC tenders.",
    color: "bg-orange-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  },
  simpro: {
    label: "Simpro",
    description:
      "Two-way sync of jobs, quotes, invoices, and clients. Keep FieldPro and Simpro in perfect sync with real-time updates.",
    color: "bg-blue-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  gmail: {
    label: "Gmail",
    description:
      "Monitor your inbox for tender invitations and RFQs. Automatically import tender details from email notifications.",
    color: "bg-red-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <path d="M22 6l-10 7L2 6" />
      </svg>
    ),
  },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const getIntegration = (provider: string) =>
    integrations.find((i) => i.provider === provider);

  const handleToggle = async (provider: string) => {
    const existing = getIntegration(provider);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          is_enabled: existing ? (existing.is_enabled ? 0 : 1) : 1,
        }),
      });
      await fetchIntegrations();
      setMessage({ type: "success", text: `${PROVIDER_INFO[provider]?.label} ${existing?.is_enabled ? "disabled" : "enabled"}` });
    } catch {
      setMessage({ type: "error", text: "Failed to update integration" });
    }
  };

  const handleSync = async (provider: string) => {
    setSyncing(provider);
    setMessage(null);
    try {
      const endpoint =
        provider === "estimateone"
          ? "/api/integrations/estimateone/sync"
          : provider === "simpro"
          ? "/api/integrations/simpro/sync"
          : null;

      if (!endpoint) {
        setMessage({ type: "error", text: "Sync not available for this provider" });
        return;
      }

      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: "success",
          text: `Synced ${provider === "estimateone" ? `${data.new_tenders_found} tenders found` : `${data.items_synced || 0} items synced`}`,
        });
        await fetchIntegrations();
      } else {
        setMessage({ type: "error", text: data.error || "Sync failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Sync request failed" });
    } finally {
      setSyncing(null);
    }
  };

  const openConfig = (provider: string) => {
    const existing = getIntegration(provider);
    let extraConfig: Record<string, unknown> = {};
    try {
      extraConfig = JSON.parse(existing?.extra_config || "{}");
    } catch {
      extraConfig = {};
    }

    if (provider === "estimateone") {
      setConfigForm({
        api_url: existing?.api_url || "https://app.estimateone.com",
        api_key: existing?.api_key || "",
        states: (extraConfig.states as string[] || ["VIC"]).join(", "),
        trades: (extraConfig.trades as string[] || ["Electrical"]).join(", "),
        keywords: (extraConfig.keywords as string[] || [
          "electrical", "switchboard", "power", "lighting",
          "cabling", "data", "fire alarm", "emergency lighting",
          "solar", "EV charger",
        ]).join(", "),
      });
    } else if (provider === "simpro") {
      setConfigForm({
        api_url: existing?.api_url || "https://api.simprogroup.com",
        api_key: existing?.api_key || "",
        api_secret: existing?.api_secret || "",
        sync_jobs: String(extraConfig.sync_jobs ?? true),
        sync_quotes: String(extraConfig.sync_quotes ?? true),
        sync_invoices: String(extraConfig.sync_invoices ?? true),
        sync_clients: String(extraConfig.sync_clients ?? true),
      });
    } else if (provider === "gmail") {
      setConfigForm({
        username: existing?.username || "",
        password: existing?.password || "",
        filter_from: (extraConfig.filter_from as string) || "notifications@estimateone.com",
        filter_subject: (extraConfig.filter_subject as string) || "New Tender Invitation",
      });
    }

    setConfiguring(provider);
  };

  const saveConfig = async () => {
    if (!configuring) return;
    setMessage(null);

    const payload: Record<string, unknown> = { provider: configuring };

    if (configuring === "estimateone") {
      payload.api_url = configForm.api_url;
      payload.api_key = configForm.api_key;
      payload.extra_config = JSON.stringify({
        states: configForm.states?.split(",").map((s) => s.trim()).filter(Boolean) || [],
        trades: configForm.trades?.split(",").map((s) => s.trim()).filter(Boolean) || [],
        keywords: configForm.keywords?.split(",").map((s) => s.trim()).filter(Boolean) || [],
      });
    } else if (configuring === "simpro") {
      payload.api_url = configForm.api_url;
      payload.api_key = configForm.api_key;
      payload.api_secret = configForm.api_secret;
      payload.extra_config = JSON.stringify({
        sync_jobs: configForm.sync_jobs === "true",
        sync_quotes: configForm.sync_quotes === "true",
        sync_invoices: configForm.sync_invoices === "true",
        sync_clients: configForm.sync_clients === "true",
      });
    } else if (configuring === "gmail") {
      payload.username = configForm.username;
      payload.password = configForm.password;
      payload.extra_config = JSON.stringify({
        filter_from: configForm.filter_from,
        filter_subject: configForm.filter_subject,
      });
    }

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Configuration saved" });
        setConfiguring(null);
        await fetchIntegrations();
      } else {
        setMessage({ type: "error", text: "Failed to save configuration" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save configuration" });
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect external services to automate your tender workflow
          </p>
        </div>
        <Link
          href="/integrations/imported"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Imported Tenders
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Integration Cards */}
      <div className="space-y-6">
        {(["estimateone", "simpro", "gmail"] as const).map((provider) => {
          const info = PROVIDER_INFO[provider];
          const integration = getIntegration(provider);
          const enabled = !!integration?.is_enabled;

          return (
            <div key={provider} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${info.color}`}>
                    {info.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{info.label}</h3>
                    <p className="text-sm text-gray-500">{info.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => handleToggle(provider)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      enabled ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                        enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        enabled
                          ? integration?.sync_status === "error"
                            ? "bg-red-500"
                            : "bg-green-500"
                          : "bg-gray-300"
                      }`} />
                      {enabled
                        ? integration?.sync_status === "error"
                          ? "Error"
                          : "Connected"
                        : "Disabled"}
                    </span>
                    <span>Last sync: {formatTime(integration?.last_sync || null)}</span>
                    {integration?.recent_logs && integration.recent_logs.length > 0 && (
                      <span>
                        {integration.recent_logs[0].items_processed} items last sync
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openConfig(provider)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Configure
                    </button>
                    {provider !== "gmail" && (
                      <button
                        onClick={() => handleSync(provider)}
                        disabled={!enabled || syncing === provider}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                      >
                        {syncing === provider ? (
                          <>
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Sync Now
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sync Log */}
                {integration?.recent_logs && integration.recent_logs.length > 0 && (
                  <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Recent Activity
                    </h4>
                    <div className="space-y-1.5">
                      {integration.recent_logs.slice(0, 3).map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">
                            {log.action} &middot; {log.items_processed} items
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${
                                log.status === "success" ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                            <span className="text-gray-400">{formatTime(log.created_at)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* EstimateOne Feature Highlight */}
      <div className="mt-8 rounded-xl border border-orange-200 bg-orange-50 p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-orange-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Morning Digest
        </h3>
        <p className="mt-2 text-sm text-orange-800">
          When EstimateOne is connected, you&apos;ll receive a daily morning digest with all new
          VIC electrical tenders. Each tender is presented with a quick Quote / No Quote
          decision button so nothing gets missed.
        </p>
        <Link
          href="/integrations/imported"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-900"
        >
          View Imported Tenders
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Configuration Modal */}
      {configuring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Configure {PROVIDER_INFO[configuring]?.label}
            </h3>

            <div className="mt-4 space-y-4">
              {configuring === "estimateone" && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">API URL</label>
                    <input
                      type="text"
                      value={configForm.api_url || ""}
                      onChange={(e) => setConfigForm({ ...configForm, api_url: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">API Key</label>
                    <input
                      type="password"
                      value={configForm.api_key || ""}
                      onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Enter your EstimateOne API key"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      States <span className="text-gray-400">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={configForm.states || ""}
                      onChange={(e) => setConfigForm({ ...configForm, states: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="VIC, NSW, QLD"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Trades <span className="text-gray-400">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={configForm.trades || ""}
                      onChange={(e) => setConfigForm({ ...configForm, trades: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Electrical, Data/Comms"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Keywords <span className="text-gray-400">(comma-separated)</span>
                    </label>
                    <textarea
                      value={configForm.keywords || ""}
                      onChange={(e) => setConfigForm({ ...configForm, keywords: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="electrical, switchboard, power, lighting, cabling"
                    />
                  </div>
                </>
              )}

              {configuring === "simpro" && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">API URL</label>
                    <input
                      type="text"
                      value={configForm.api_url || ""}
                      onChange={(e) => setConfigForm({ ...configForm, api_url: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">API Key</label>
                    <input
                      type="password"
                      value={configForm.api_key || ""}
                      onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">API Secret</label>
                    <input
                      type="password"
                      value={configForm.api_secret || ""}
                      onChange={(e) => setConfigForm({ ...configForm, api_secret: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Sync Options</label>
                    {["sync_jobs", "sync_quotes", "sync_invoices", "sync_clients"].map((key) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={configForm[key] === "true"}
                          onChange={(e) =>
                            setConfigForm({ ...configForm, [key]: String(e.target.checked) })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {key.replace("sync_", "")}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {configuring === "gmail" && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Gmail Address</label>
                    <input
                      type="email"
                      value={configForm.username || ""}
                      onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="you@company.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">App Password</label>
                    <input
                      type="password"
                      value={configForm.password || ""}
                      onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Google App Password"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Use a Google App Password, not your regular password
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Filter: From Address</label>
                    <input
                      type="text"
                      value={configForm.filter_from || ""}
                      onChange={(e) => setConfigForm({ ...configForm, filter_from: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Filter: Subject Contains</label>
                    <input
                      type="text"
                      value={configForm.filter_subject || ""}
                      onChange={(e) => setConfigForm({ ...configForm, filter_subject: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfiguring(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
