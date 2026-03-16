"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";

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
  [key: string]: unknown;
}

interface Job {
  id: string;
  title: string;
  job_number: string;
  [key: string]: unknown;
}

interface Task {
  id: string;
  task_number: string;
  title: string;
  pin_x: number | null;
  pin_y: number | null;
  status: string;
  [key: string]: unknown;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [jobFilter, setJobFilter] = useState("");

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

  // Detail modal
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planTasks, setPlanTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

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

  // Fetch tasks linked to a plan
  const fetchPlanTasks = useCallback(async (planId: string) => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/tasks?plan_id=${planId}`);
      if (!res.ok) {
        setPlanTasks([]);
        return;
      }
      const data = await res.json();
      setPlanTasks(data);
    } catch {
      setPlanTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    fetchPlanTasks(plan.id);
  };

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
      setNewPlan({ name: "", job_id: "", sheet_number: "", version: "1", notes: "" });
      fetchPlans();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const jobOptions = [
    { value: "", label: "All Jobs" },
    ...jobs.map((j) => ({ value: j.id, label: `${j.job_number} - ${j.title}` })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans & Drawings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage project plans, blueprints, and drawings
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowUpload(true)}>
          Upload Plan
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <Select
          value={jobFilter}
          onChange={setJobFilter}
          options={jobOptions}
          placeholder="All Jobs"
          className="w-64"
        />
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
      ) : plans.length === 0 ? (
        <EmptyState
          title="No plans found"
          description="Upload your first plan or adjust the job filter."
          action={
            <Button variant="primary" onClick={() => setShowUpload(true)}>
              Upload Plan
            </Button>
          }
        />
      ) : (
        /* Plans Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => handleSelectPlan(plan)}
              className="cursor-pointer"
            >
              <Card className="transition-shadow hover:shadow-md">
                {/* Plan icon placeholder */}
                <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-gray-50">
                  <svg
                    className="h-12 w-12 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>

                <h3 className="truncate text-sm font-semibold text-gray-900">
                  {plan.name}
                </h3>
                {plan.job_title && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {plan.job_title}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  {plan.sheet_number && (
                    <span>Sheet {plan.sheet_number}</span>
                  )}
                  <span>v{plan.version}</span>
                  <span className="ml-auto">{formatDate(plan.created_at)}</span>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Upload Plan Modal */}
      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Plan"
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
              {creating ? "Creating..." : "Upload Plan"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={newPlan.name}
              onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={newPlan.notes}
              onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Additional notes (optional)"
            />
          </div>
        </div>
      </Modal>

      {/* Plan Detail Modal */}
      <Modal
        isOpen={!!selectedPlan}
        onClose={() => {
          setSelectedPlan(null);
          setPlanTasks([]);
        }}
        title={selectedPlan?.name || "Plan Details"}
      >
        {selectedPlan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-500">Job</span>
                <p className="text-gray-900">{selectedPlan.job_title || "\u2014"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-500">Sheet Number</span>
                <p className="text-gray-900">{selectedPlan.sheet_number || "\u2014"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-500">Version</span>
                <p className="text-gray-900">v{selectedPlan.version}</p>
              </div>
              <div>
                <span className="font-medium text-gray-500">Uploaded</span>
                <p className="text-gray-900">{formatDate(selectedPlan.created_at)}</p>
              </div>
            </div>

            {selectedPlan.notes && (
              <div>
                <span className="text-sm font-medium text-gray-500">Notes</span>
                <p className="mt-1 text-sm text-gray-700">{selectedPlan.notes}</p>
              </div>
            )}

            {/* Task Pins */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">
                Linked Tasks
              </h4>
              {loadingTasks ? (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : planTasks.length === 0 ? (
                <p className="text-sm text-gray-400">No tasks linked to this plan.</p>
              ) : (
                <div className="space-y-2">
                  {planTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <div>
                        <span className="text-xs font-mono text-gray-500">
                          {task.task_number}
                        </span>
                        <span className="ml-2 text-sm text-gray-900">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.pin_x !== null && task.pin_y !== null && (
                          <span className="text-xs text-gray-400">
                            ({task.pin_x}, {task.pin_y})
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            task.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : task.status === "in_progress"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
