"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import SearchInput from "@/components/ui/SearchInput";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Plan {
  id: string;
  name: string;
  job_id: string | null;
  job_title: string | null;
  file_name: string | null;
  version: number;
  sheet_number: string | null;
  notes: string | null;
  created_at: string;
  task_count?: number;
  [key: string]: unknown;
}

interface Job {
  id: string;
  title: string;
  job_number: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/* ------------------------------------------------------------------ */
/*  BlueprintIcon (thumbnail placeholder)                              */
/* ------------------------------------------------------------------ */

function BlueprintIcon({ sheet }: { sheet: string | null }) {
  return (
    <div className="relative flex h-40 items-center justify-center rounded-t-xl bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
      {/* grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* blueprint icon */}
      <svg
        className="absolute left-3 top-3 h-5 w-5 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
      {/* sheet number large */}
      <span className="relative z-10 text-3xl font-bold tracking-tight text-slate-400/70 select-none">
        {sheet || "---"}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  View toggle icons                                                  */
/* ------------------------------------------------------------------ */

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-blue-600" : "text-gray-400"}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
      />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-blue-600" : "text-gray-400"}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "job">("recent");

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: "",
    job_id: "",
    sheet_number: "",
    version: "1",
    notes: "",
  });
  const [isDragging, setIsDragging] = useState(false);

  /* ------ Fetchers ------------------------------------------------ */

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (jobFilter) params.set("job_id", jobFilter);
      const res = await fetch(`/api/plans?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, [jobFilter]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  /* ------ Derived data -------------------------------------------- */

  const filteredPlans = useMemo(() => {
    let result = [...plans];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.job_title && p.job_title.toLowerCase().includes(q)) ||
          (p.sheet_number && p.sheet_number.toLowerCase().includes(q))
      );
    }

    if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "job") {
      result.sort((a, b) =>
        (a.job_title || "").localeCompare(b.job_title || "")
      );
    } else {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [plans, searchQuery, sortBy]);

  /* ------ Handlers ------------------------------------------------ */

  const handleCreatePlan = async () => {
    if (!newPlan.name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlan.name,
          job_id: newPlan.job_id || null,
          sheet_number: newPlan.sheet_number || null,
          version: parseInt(newPlan.version, 10) || 1,
          notes: newPlan.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create plan");
      setShowUpload(false);
      setNewPlan({
        name: "",
        job_id: "",
        sheet_number: "",
        version: "1",
        notes: "",
      });
      fetchPlans();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const jobOptions = [
    { value: "", label: "All Jobs" },
    ...jobs.map((j) => ({
      value: j.id,
      label: `${j.job_number} - ${j.title}`,
    })),
  ];

  const sortOptions = [
    { value: "recent", label: "Recent" },
    { value: "name", label: "Name" },
    { value: "job", label: "Job" },
  ];

  /* ------ Render -------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Plans &amp; Drawings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage project plans, blueprints, and drawings
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-blue-50" : "hover:bg-gray-50"}`}
              aria-label="Grid view"
            >
              <GridIcon active={viewMode === "grid"} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-blue-50" : "hover:bg-gray-50"}`}
              aria-label="List view"
            >
              <ListIcon active={viewMode === "list"} />
            </button>
          </div>
          <Button variant="primary" onClick={() => setShowUpload(true)}>
            <svg
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            Upload Plan
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search plans..."
          className="w-64"
        />
        <Select
          value={jobFilter}
          onChange={setJobFilter}
          options={jobOptions}
          placeholder="All Jobs"
          className="w-64"
        />
        <Select
          value={sortBy}
          onChange={(v) => setSortBy(v as "recent" | "name" | "job")}
          options={sortOptions}
          placeholder="Sort by"
          className="w-44"
        />
        <div className="ml-auto text-sm text-gray-400">
          {filteredPlans.length} plan{filteredPlans.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          title="No plans found"
          description={
            searchQuery || jobFilter
              ? "Try adjusting your search or filters."
              : "Upload your first plan to get started."
          }
          action={
            <Button variant="primary" onClick={() => setShowUpload(true)}>
              Upload Plan
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        /* ---------- Grid View ---------- */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => (
            <Link key={plan.id} href={`/plans/${plan.id}`} className="group">
              <Card
                className="transition-all duration-200 hover:shadow-md hover:border-blue-200 group-hover:-translate-y-0.5 overflow-hidden"
                padding={false}
              >
                {/* Thumbnail */}
                <BlueprintIcon sheet={plan.sheet_number} />

                {/* Info */}
                <div className="p-4">
                  <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {plan.name}
                  </h3>
                  {plan.job_title && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {plan.job_title}
                    </p>
                  )}

                  {/* Badges row */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {plan.sheet_number && (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Sheet {plan.sheet_number}
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                      v{plan.version}
                    </span>
                    {typeof plan.task_count === "number" &&
                      plan.task_count > 0 && (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {plan.task_count} task
                          {plan.task_count !== 1 ? "s" : ""} pinned
                        </span>
                      )}
                  </div>

                  {/* Date */}
                  <p className="mt-2 text-xs text-gray-400">
                    {formatDate(plan.created_at)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* ---------- List View ---------- */
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Job</th>
                  <th className="px-5 py-3">Sheet #</th>
                  <th className="px-5 py-3">Version</th>
                  <th className="px-5 py-3">Tasks</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPlans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="group transition-colors hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/plans/${plan.id}`}
                        className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors"
                      >
                        {plan.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {plan.job_title || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {plan.sheet_number ? (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {plan.sheet_number}
                        </span>
                      ) : (
                        <span className="text-gray-400">{"—"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                        v{plan.version}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {typeof plan.task_count === "number"
                        ? plan.task_count
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {formatDate(plan.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------ */}
      {/*  Upload Plan Modal                                            */}
      {/* ------------------------------------------------------------ */}
      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Plan"
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowUpload(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreatePlan}
              disabled={!newPlan.name || creating}
            >
              {creating ? "Saving..." : "Save Plan"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
              isDragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400"
            }`}
          >
            <svg
              className="mb-3 h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Drag &amp; drop plan files here
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PDF, DWG, DXF, PNG, or JPG up to 100 MB
            </p>
            <button className="mt-3 rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-blue-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50">
              Browse files
            </button>
          </div>

          {/* Form fields */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newPlan.name}
              onChange={(e) =>
                setNewPlan({ ...newPlan, name: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Plan name"
            />
          </div>

          <Select
            label="Job"
            value={newPlan.job_id}
            onChange={(v) => setNewPlan({ ...newPlan, job_id: v })}
            options={[
              { value: "", label: "Select a job" },
              ...jobs.map((j) => ({
                value: j.id,
                label: `${j.job_number} - ${j.title}`,
              })),
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Sheet Number
              </label>
              <input
                type="text"
                value={newPlan.sheet_number}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, sheet_number: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. A-101"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Version
              </label>
              <input
                type="number"
                min="1"
                value={newPlan.version}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, version: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={newPlan.notes}
              onChange={(e) =>
                setNewPlan({ ...newPlan, notes: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Additional notes (optional)"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
