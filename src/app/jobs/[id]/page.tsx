"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import PriorityBadge from "@/components/ui/PriorityBadge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";

interface Job {
  id: string;
  job_number: string;
  title: string;
  description?: string;
  client_name?: string;
  client?: { name: string };
  status: string;
  priority: string;
  job_type?: string;
  due_date: string;
  start_date?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  estimated_cost?: number;
  actual_cost?: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
}

interface ScheduleEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  assigned_to?: string;
  type?: string;
}

interface Invoice {
  id: string;
  invoice_number?: string;
  amount: number;
  status: string;
  due_date: string;
}

interface Quote {
  id: string;
  quote_number?: string;
  amount: number;
  status: string;
  created_at?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "\u2014";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type TabKey = "overview" | "tasks" | "schedule" | "documents" | "financials";

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Tasks" },
  { key: "schedule", label: "Schedule" },
  { key: "documents", label: "Documents" },
  { key: "financials", label: "Financials" },
];

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ""}`} />
  );
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isOver = value > max;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={`font-medium ${isOver ? "text-red-600" : "text-gray-900"}`}>
          {value} / {max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-all ${
            isOver ? "bg-red-500" : pct >= 100 ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [job, setJob] = useState<Job | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Add task modal
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "pending",
    due_date: "",
    assigned_to: "",
  });
  const [submittingTask, setSubmittingTask] = useState(false);

  const fetchJobData = useCallback(async () => {
    try {
      const [jobRes, tasksRes, schedulesRes, invoicesRes, quotesRes] =
        await Promise.allSettled([
          fetch(`/api/jobs/${jobId}`),
          fetch(`/api/tasks?job_id=${jobId}`),
          fetch(`/api/schedules?job_id=${jobId}`),
          fetch(`/api/invoices?job_id=${jobId}`),
          fetch(`/api/quotes?job_id=${jobId}`),
        ]);

      if (jobRes.status === "fulfilled" && jobRes.value.ok) {
        const jobData = await jobRes.value.json();
        setJob(jobData);
      } else {
        throw new Error("Failed to fetch job details");
      }

      if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
        const data = await tasksRes.value.json();
        setTasks(Array.isArray(data) ? data : data.data ?? []);
      }

      if (schedulesRes.status === "fulfilled" && schedulesRes.value.ok) {
        const data = await schedulesRes.value.json();
        setSchedules(Array.isArray(data) ? data : data.data ?? []);
      }

      if (invoicesRes.status === "fulfilled" && invoicesRes.value.ok) {
        const data = await invoicesRes.value.json();
        setInvoices(Array.isArray(data) ? data : data.data ?? []);
      }

      if (quotesRes.status === "fulfilled" && quotesRes.value.ok) {
        const data = await quotesRes.value.json();
        setQuotes(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobData();
  }, [fetchJobData]);

  async function handleAddTask() {
    if (!newTask.title.trim()) return;
    setSubmittingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTask, job_id: jobId }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      const created = await res.json();
      setTasks((prev) => [...prev, created]);
      setShowAddTask(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        status: "pending",
        due_date: "",
        assigned_to: "",
      });
    } catch {
      alert("Failed to create task. Please try again.");
    } finally {
      setSubmittingTask(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            Failed to load job
          </p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/jobs")}>
              Back to Jobs
            </Button>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <ShimmerBlock className="h-10 w-72" />
        <ShimmerBlock className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ShimmerBlock className="h-64" />
          <ShimmerBlock className="h-64" />
        </div>
      </div>
    );
  }

  if (!job) return null;

  const fullAddress = [job.address, job.city, job.state, job.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/jobs")}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {job.job_number} &ndash; {job.title}
              </h1>
              <StatusBadge status={job.status} />
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.push(`/jobs/${jobId}/edit`)}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
          }
        >
          Edit
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Job Details */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Job Details
            </h2>
            <dl className="space-y-4">
              {job.description && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {job.description}
                  </dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm capitalize text-gray-900">
                    {job.job_type ?? "\u2014"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Priority</dt>
                  <dd className="mt-1">
                    <PriorityBadge priority={job.priority} />
                  </dd>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(job.start_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(job.due_date)}
                  </dd>
                </div>
              </div>
              {fullAddress && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">{fullAddress}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Client</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {job.client_name ?? job.client?.name ?? "\u2014"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {job.assigned_to ?? "\u2014"}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Financial Summary */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Financial Summary
            </h2>
            <div className="space-y-6">
              <ProgressBar
                label="Hours"
                value={job.actual_hours ?? 0}
                max={job.estimated_hours ?? 0}
              />
              <ProgressBar
                label="Cost"
                value={job.actual_cost ?? 0}
                max={job.estimated_cost ?? 0}
              />
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="text-sm text-gray-500">Estimated Hours</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {job.estimated_hours ?? 0}h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Actual Hours</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {job.actual_hours ?? 0}h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimated Cost</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(job.estimated_cost ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Actual Cost</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(job.actual_cost ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "tasks" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
            <Button
              size="sm"
              onClick={() => setShowAddTask(true)}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              }
            >
              Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Add tasks to track work for this job."
              action={
                <Button size="sm" onClick={() => setShowAddTask(true)}>
                  Add Task
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.status} size="sm" />
                      <PriorityBadge priority={task.priority} />
                      {task.assigned_to && (
                        <span className="text-xs text-gray-500">
                          {task.assigned_to}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-gray-400">
                          Due {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Task Modal */}
          <Modal
            isOpen={showAddTask}
            onClose={() => setShowAddTask(false)}
            title="Add Task"
            footer={
              <>
                <Button variant="secondary" onClick={() => setShowAddTask(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTask} disabled={submittingTask || !newTask.title.trim()}>
                  {submittingTask ? "Adding..." : "Add Task"}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Task description (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Priority"
                  value={newTask.priority}
                  onChange={(val) => setNewTask({ ...newTask, priority: val })}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                    { value: "urgent", label: "Urgent" },
                  ]}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Team member name"
                />
              </div>
            </div>
          </Modal>
        </Card>
      )}

      {activeTab === "schedule" && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Schedule
          </h2>
          {schedules.length === 0 ? (
            <EmptyState
              title="No schedule events"
              description="No events have been scheduled for this job yet."
            />
          ) : (
            <div className="space-y-2">
              {schedules.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(event.start_time)} {formatTime(event.start_time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </p>
                    {event.assigned_to && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        {event.assigned_to}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "documents" && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Documents
          </h2>
          <EmptyState
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            }
            title="No documents"
            description="Documents attached to this job will appear here."
          />
        </Card>
      )}

      {activeTab === "financials" && (
        <div className="space-y-6">
          {/* Quotes */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Quotes</h2>
            {quotes.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No quotes associated with this job
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Quote #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {quotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-blue-600">
                          {quote.quote_number ?? `Q-${quote.id}`}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {formatCurrency(quote.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <StatusBadge status={quote.status} size="sm" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {formatDate(quote.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Invoices */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No invoices associated with this job
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Invoice #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Due Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-blue-600">
                          {inv.invoice_number ?? `INV-${inv.id}`}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <StatusBadge status={inv.status} size="sm" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {formatDate(inv.due_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
