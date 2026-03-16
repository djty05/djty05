"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";

interface Client {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
}

const jobTypeOptions = [
  { value: "service", label: "Service" },
  { value: "installation", label: "Installation" },
  { value: "remodel", label: "Remodel" },
  { value: "maintenance", label: "Maintenance" },
  { value: "inspection", label: "Inspection" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function CreateJobPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    client_id: "",
    job_type: "",
    priority: "medium",
    address: "",
    city: "",
    state: "",
    zip: "",
    estimated_hours: "",
    estimated_cost: "",
    start_date: "",
    due_date: "",
    assigned_to: "",
  });

  useEffect(() => {
    async function fetchMeta() {
      try {
        const [clientsRes, teamRes] = await Promise.allSettled([
          fetch("/api/clients"),
          fetch("/api/team"),
        ]);

        if (clientsRes.status === "fulfilled" && clientsRes.value.ok) {
          const data = await clientsRes.value.json();
          setClients(Array.isArray(data) ? data : data.data ?? []);
        }

        if (teamRes.status === "fulfilled" && teamRes.value.ok) {
          const data = await teamRes.value.json();
          setTeam(Array.isArray(data) ? data : data.data ?? []);
        }
      } catch {
        // Non-critical: forms still work with manual input
      } finally {
        setLoadingMeta(false);
      }
    }

    fetchMeta();
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...form,
        estimated_hours: form.estimated_hours
          ? parseFloat(form.estimated_hours)
          : undefined,
        estimated_cost: form.estimated_cost
          ? parseFloat(form.estimated_cost)
          : undefined,
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message ?? "Failed to create job");
      }

      const created = await res.json();
      router.push(`/jobs/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-500";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/jobs")}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Job</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className={inputClass}
                placeholder="Job title"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                className={inputClass}
                placeholder="Describe the job scope and requirements..."
              />
            </div>

            {/* Client + Type + Priority */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Client"
                value={form.client_id}
                onChange={(val) => updateField("client_id", val)}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
                placeholder={loadingMeta ? "Loading..." : "Select client"}
                disabled={loadingMeta}
              />
              <Select
                label="Job Type"
                value={form.job_type}
                onChange={(val) => updateField("job_type", val)}
                options={jobTypeOptions}
                placeholder="Select type"
              />
              <Select
                label="Priority"
                value={form.priority}
                onChange={(val) => updateField("priority", val)}
                options={priorityOptions}
              />
            </div>

            {/* Address */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className={inputClass}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className={inputClass}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className={inputClass}
                  placeholder="State"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Zip
                </label>
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                  className={inputClass}
                  placeholder="Zip code"
                />
              </div>
            </div>

            {/* Estimates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.estimated_hours}
                  onChange={(e) => updateField("estimated_hours", e.target.value)}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Estimated Cost ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimated_cost}
                  onChange={(e) => updateField("estimated_cost", e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => updateField("start_date", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => updateField("due_date", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Assign To */}
            <Select
              label="Assign To"
              value={form.assigned_to}
              onChange={(val) => updateField("assigned_to", val)}
              options={team.map((m) => ({ value: m.id, label: m.name }))}
              placeholder={loadingMeta ? "Loading..." : "Select team member"}
              disabled={loadingMeta}
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push("/jobs")}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !form.title.trim()}>
            {submitting ? "Creating..." : "Create Job"}
          </Button>
        </div>
      </form>
    </div>
  );
}
