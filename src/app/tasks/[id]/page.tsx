"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import PriorityBadge from "@/components/ui/PriorityBadge";

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
  plan_id: string | null;
  pin_x: number | null;
  pin_y: number | null;
  due_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface TeamMember {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface Plan {
  id: string;
  name: string;
  job_title: string | null;
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

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Task not found");
        throw new Error("Failed to fetch task");
      }
      const data = await res.json();
      setTask(data);

      // Fetch plan if task has plan_id
      if (data.plan_id) {
        try {
          const planRes = await fetch(`/api/plans/${data.plan_id}`);
          if (planRes.ok) {
            const planData = await planRes.json();
            setPlan(planData);
          }
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

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
    fetchTask();
    fetchTeam();
  }, [fetchTask, fetchTeam]);

  const getUserName = (userId: string | null) => {
    if (!userId) return "\u2014";
    const member = team.find((m) => m.id === userId);
    return member ? member.name : "\u2014";
  };

  const updateStatus = async (newStatus: string) => {
    if (!task) return;
    setUpdating(true);
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (newStatus === "completed") {
        body.completed_date = new Date().toISOString();
      }
      if (newStatus === "open") {
        body.completed_date = null;
      }

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated = await res.json();
      setTask(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push("/tasks")}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Tasks
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">{error || "Task not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/tasks")}
        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Tasks
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-gray-500">{task.task_number}</span>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{task.title}</h1>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {task.status === "open" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => updateStatus("in_progress")}
              disabled={updating}
            >
              {updating ? "Updating..." : "Start Work"}
            </Button>
          )}
          {task.status === "in_progress" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => updateStatus("completed")}
              disabled={updating}
            >
              {updating ? "Updating..." : "Mark Complete"}
            </Button>
          )}
          {task.status === "completed" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateStatus("open")}
              disabled={updating}
            >
              {updating ? "Updating..." : "Reopen"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Details</h2>
            {task.description ? (
              <p className="mb-6 text-sm leading-relaxed text-gray-700">
                {task.description}
              </p>
            ) : (
              <p className="mb-6 text-sm italic text-gray-400">
                No description provided.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Job
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {task.job_title ? (
                    <button
                      onClick={() => router.push(`/jobs/${task.job_id}`)}
                      className="text-blue-600 hover:underline"
                    >
                      {task.job_title}
                    </button>
                  ) : (
                    "\u2014"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Category
                </dt>
                <dd className="mt-1 text-sm capitalize text-gray-900">
                  {task.category || "\u2014"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Assigned To
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {getUserName(task.assigned_to)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Due Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(task.due_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(task.created_at)}
                </dd>
              </div>
              {task.completed_date && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Completed
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateTime(task.completed_date)}
                  </dd>
                </div>
              )}
            </div>
          </Card>

          {/* Activity / Comments */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Activity</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    Task <span className="font-medium">{task.task_number}</span> was
                    created
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDateTime(task.created_at)}
                  </p>
                </div>
              </div>
              {task.completed_date && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Task marked as completed</p>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(task.completed_date)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Status</h3>
            <div className="space-y-3">
              {["open", "in_progress", "completed"].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      task.status === s
                        ? s === "open"
                          ? "bg-sky-500"
                          : s === "in_progress"
                          ? "bg-amber-500"
                          : "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                  <span
                    className={`text-sm capitalize ${
                      task.status === s
                        ? "font-medium text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {s.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Related Plan */}
          {task.plan_id && plan && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Related Plan
              </h3>
              <div className="space-y-2 text-sm">
                <button
                  onClick={() => router.push("/plans")}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {plan.name}
                </button>
                {(task.pin_x !== null && task.pin_y !== null) && (
                  <p className="text-xs text-gray-500">
                    Pin at ({task.pin_x}, {task.pin_y})
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
