"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import PriorityBadge from "@/components/ui/PriorityBadge";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";

interface Task {
  id: string;
  task_number: string;
  title: string;
  description: string | null;
  job_id: string | null;
  job_title: string | null;
  status: string;
  priority: string;
  category: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  [key: string]: unknown;
}

interface Job {
  id: string;
  title: string;
  job_number: string;
  [key: string]: unknown;
}

interface TeamMember {
  id: string;
  name: string;
  [key: string]: unknown;
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
];

const priorityOptions = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const categoryOptions = [
  { value: "general", label: "General" },
  { value: "installation", label: "Installation" },
  { value: "demolition", label: "Demolition" },
  { value: "inspection", label: "Inspection" },
  { value: "maintenance", label: "Maintenance" },
];

const BOARD_COLUMNS = [
  { key: "open", label: "Open", color: "bg-sky-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { key: "review", label: "Review", color: "bg-purple-500" },
  { key: "completed", label: "Completed", color: "bg-green-500" },
];

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");

  // View toggle
  const [view, setView] = useState<"list" | "board">("list");

  // New Task modal
  const [showNewTask, setShowNewTask] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    job_id: "",
    priority: "medium",
    category: "general",
    assigned_to: "",
    due_date: "",
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (jobFilter) params.set("job_id", jobFilter);
      if (assignedFilter) params.set("assigned_to", assignedFilter);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, jobFilter, assignedFilter]);

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

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      if (!res.ok) return;
      const data = await res.json();
      setTeam(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchTeam();
  }, [fetchJobs, fetchTeam]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getUserName = (userId: string | null) => {
    if (!userId) return "\u2014";
    const member = team.find((m) => m.id === userId);
    return member ? member.name : "\u2014";
  };

  // Client-side search + priority filter
  const filteredTasks = tasks.filter((t) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !t.title.toLowerCase().includes(s) &&
        !t.task_number.toLowerCase().includes(s) &&
        !(t.job_title || "").toLowerCase().includes(s)
      )
        return false;
    }
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  const handleCreateTask = async () => {
    if (!newTask.title) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description || null,
          job_id: newTask.job_id || null,
          priority: newTask.priority,
          category: newTask.category,
          assigned_to: newTask.assigned_to || null,
          due_date: newTask.due_date || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setShowNewTask(false);
      setNewTask({
        title: "",
        description: "",
        job_id: "",
        priority: "medium",
        category: "general",
        assigned_to: "",
        due_date: "",
      });
      fetchTasks();
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

  const assignedOptions = [
    { value: "", label: "All Members" },
    ...team.map((m) => ({ value: m.id, label: m.name })),
  ];

  const columns = [
    {
      key: "task_number",
      label: "Task #",
      render: (v: unknown) => (
        <span className="font-mono text-sm text-gray-600">{v as string}</span>
      ),
    },
    {
      key: "title",
      label: "Title",
      render: (v: unknown) => (
        <span className="font-medium text-gray-900">{v as string}</span>
      ),
    },
    {
      key: "job_title",
      label: "Job",
      render: (v: unknown) => (
        <span className="text-sm text-gray-600">{(v as string) || "\u2014"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => <StatusBadge status={v as string} size="sm" />,
    },
    {
      key: "priority",
      label: "Priority",
      render: (v: unknown) => <PriorityBadge priority={v as string} />,
    },
    {
      key: "assigned_to",
      label: "Assigned To",
      render: (v: unknown) => (
        <span className="text-sm text-gray-600">{getUserName(v as string | null)}</span>
      ),
    },
    {
      key: "due_date",
      label: "Due Date",
      render: (v: unknown) => (
        <span className="text-sm text-gray-600">{formatDate(v as string | null)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all project tasks
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNewTask(true)}>
          New Task
        </Button>
      </div>

      {/* View Toggle + Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        {/* View Toggle */}
        <div className="mr-4 flex rounded-lg border border-gray-200">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            } rounded-l-lg`}
          >
            <svg className="mr-1 inline-block h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            List
          </button>
          <button
            onClick={() => setView("board")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "board"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            } rounded-r-lg`}
          >
            <svg className="mr-1 inline-block h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Board
          </button>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search tasks..."
          className="w-56"
        />
        <Select
          value={jobFilter}
          onChange={setJobFilter}
          options={jobOptions}
          placeholder="All Jobs"
          className="w-44"
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          placeholder="All Statuses"
          className="w-40"
        />
        <Select
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={priorityOptions}
          placeholder="All Priorities"
          className="w-40"
        />
        <Select
          value={assignedFilter}
          onChange={setAssignedFilter}
          options={assignedOptions}
          placeholder="All Members"
          className="w-40"
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
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Try adjusting your filters or create a new task."
          action={
            <Button variant="primary" onClick={() => setShowNewTask(true)}>
              New Task
            </Button>
          }
        />
      ) : view === "list" ? (
        /* List View */
        <DataTable
          columns={columns}
          data={filteredTasks as unknown as Record<string, unknown>[]}
          onRowClick={(row) => router.push(`/tasks/${row.id}`)}
        />
      ) : (
        /* Board View (Kanban) */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {BOARD_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="rounded-xl bg-gray-50 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => router.push(`/tasks/${task.id}`)}
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="mb-2 text-sm font-medium text-gray-900">
                        {task.title}
                      </div>
                      {task.job_title && (
                        <div className="mb-2 text-xs text-gray-500">
                          {task.job_title}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <PriorityBadge priority={task.priority} />
                        <div className="flex items-center gap-2">
                          {task.due_date && (
                            <span className="text-xs text-gray-400">
                              {formatDate(task.due_date)}
                            </span>
                          )}
                          {task.assigned_to && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                              {getInitials(getUserName(task.assigned_to))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-xs text-gray-400">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Task Modal */}
      <Modal
        isOpen={showNewTask}
        onClose={() => setShowNewTask(false)}
        title="New Task"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowNewTask(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTask}
              disabled={!newTask.title || creating}
            >
              {creating ? "Creating..." : "Create Task"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Task description (optional)"
            />
          </div>

          <Select
            label="Job"
            value={newTask.job_id}
            onChange={(v) => setNewTask({ ...newTask, job_id: v })}
            options={[
              { value: "", label: "Select a job" },
              ...jobs.map((j) => ({
                value: j.id,
                label: `${j.job_number} - ${j.title}`,
              })),
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={newTask.priority}
              onChange={(v) => setNewTask({ ...newTask, priority: v })}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ]}
            />
            <Select
              label="Category"
              value={newTask.category}
              onChange={(v) => setNewTask({ ...newTask, category: v })}
              options={categoryOptions}
            />
          </div>

          <Select
            label="Assigned To"
            value={newTask.assigned_to}
            onChange={(v) => setNewTask({ ...newTask, assigned_to: v })}
            options={[
              { value: "", label: "Unassigned" },
              ...team.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
