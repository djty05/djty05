"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatsCard from "@/components/ui/StatsCard";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import PriorityBadge from "@/components/ui/PriorityBadge";

interface Job {
  id: string;
  job_number: string;
  title: string;
  client_name?: string;
  client?: { name: string };
  status: string;
  priority: string;
  due_date: string;
  assigned_to?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  job_id?: string;
  assigned_to?: string;
  updated_at?: string;
}

interface ScheduleEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  assigned_to?: string;
  color?: string;
  type?: string;
}

interface Invoice {
  id: string;
  invoice_number?: string;
  client_name?: string;
  amount: number;
  status: string;
  due_date: string;
}

interface RevenueData {
  total_revenue?: number;
  monthly_revenue?: number;
  change?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isPastDue(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ""}`}
    />
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [revenueRes, jobsRes, tasksRes, schedulesRes, invoicesRes] =
          await Promise.all([
            fetch("/api/reports?type=revenue"),
            fetch("/api/jobs"),
            fetch("/api/tasks"),
            fetch("/api/schedules"),
            fetch("/api/invoices"),
          ]);

        if (!revenueRes.ok || !jobsRes.ok || !tasksRes.ok || !schedulesRes.ok || !invoicesRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [revenueData, jobsData, tasksData, schedulesData, invoicesData] =
          await Promise.all([
            revenueRes.json(),
            jobsRes.json(),
            tasksRes.json(),
            schedulesRes.json(),
            invoicesRes.json(),
          ]);

        setRevenue(revenueData);
        setJobs(Array.isArray(jobsData) ? jobsData : jobsData.data ?? []);
        setTasks(Array.isArray(tasksData) ? tasksData : tasksData.data ?? []);
        setSchedules(
          Array.isArray(schedulesData) ? schedulesData : schedulesData.data ?? []
        );
        setInvoices(
          Array.isArray(invoicesData) ? invoicesData : invoicesData.data ?? []
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const activeJobs = jobs.filter(
    (j) => j.status === "in_progress" || j.status === "scheduled"
  );
  const tasksDueToday = tasks.filter((t) => isToday(t.due_date) && t.status !== "completed");
  const outstandingInvoices = invoices.filter(
    (inv) => inv.status !== "paid" && inv.status !== "cancelled"
  );
  const outstandingTotal = outstandingInvoices.reduce(
    (sum, inv) => sum + (inv.amount ?? 0),
    0
  );
  const overdueInvoices = invoices.filter(
    (inv) => isPastDue(inv.due_date) && inv.status !== "paid" && inv.status !== "cancelled"
  );
  const overdueTasks = tasks.filter(
    (t) => isPastDue(t.due_date) && t.status !== "completed"
  );
  const todaySchedules = schedules.filter((s) => isToday(s.start_time));
  const recentActivity = [...tasks, ...jobs]
    .filter((item) => "updated_at" in item && item.updated_at)
    .sort((a, b) => {
      const aDate = "updated_at" in a ? (a as Task).updated_at ?? "" : "";
      const bDate = "updated_at" in b ? (b as Task).updated_at ?? "" : "";
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, 8);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900">Failed to load dashboard</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, Alex
        </h1>
        <p className="mt-1 text-sm text-gray-500">{todayStr}</p>
      </div>

      {/* Stats Row */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <ShimmerBlock key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            }
            label="Active Jobs"
            value={activeJobs.length}
            changeType="neutral"
          />
          <StatsCard
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
            label="Revenue This Month"
            value={formatCurrency(revenue?.monthly_revenue ?? revenue?.total_revenue ?? 0)}
            change={revenue?.change}
            changeType="positive"
          />
          <StatsCard
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            }
            label="Outstanding Invoices"
            value={formatCurrency(outstandingTotal)}
            changeType={overdueInvoices.length > 0 ? "negative" : "neutral"}
            change={overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue` : undefined}
          />
          <StatsCard
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
            label="Tasks Due Today"
            value={tasksDueToday.length}
            changeType={tasksDueToday.length > 0 ? "negative" : "positive"}
          />
        </div>
      )}

      {/* Two-Column Grid: Schedule + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Today&apos;s Schedule
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <ShimmerBlock key={i} className="h-14" />
              ))}
            </div>
          ) : todaySchedules.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No events scheduled for today
            </p>
          ) : (
            <div className="space-y-1">
              {todaySchedules.map((event) => {
                const dotColor =
                  event.color ??
                  (event.type === "job"
                    ? "bg-blue-500"
                    : event.type === "meeting"
                    ? "bg-purple-500"
                    : "bg-emerald-500");
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg p-3 hover:bg-gray-50"
                  >
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(event.start_time)}
                        {event.end_time && ` - ${formatTime(event.end_time)}`}
                        {event.assigned_to && (
                          <span className="ml-2 text-gray-400">
                            &middot; {event.assigned_to}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <ShimmerBlock key={i} className="h-14" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No recent activity
            </p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((item, idx) => {
                const isJob = "job_number" in item;
                return (
                  <div
                    key={`${isJob ? "job" : "task"}-${item.id ?? idx}`}
                    className="flex items-start gap-3 rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        isJob
                          ? "bg-blue-100 text-blue-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {isJob ? "J" : "T"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StatusBadge status={item.status} size="sm" />
                        {"updated_at" in item && (item as Task).updated_at && (
                          <span className="text-xs text-gray-400">
                            {formatDate((item as Task).updated_at!)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Active Jobs Table */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Active Jobs
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <ShimmerBlock key={i} className="h-12" />
            ))}
          </div>
        ) : activeJobs.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No active jobs
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Job #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {activeJobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    className="cursor-pointer transition-colors hover:bg-blue-50/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-blue-600">
                      {job.job_number}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {job.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {job.client_name ?? job.client?.name ?? "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={job.status} size="sm" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <PriorityBadge priority={job.priority} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {formatDate(job.due_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Overdue Items */}
      {!loading && (overdueInvoices.length > 0 || overdueTasks.length > 0) && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-red-700">
            Overdue Items
          </h2>

          {overdueInvoices.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Overdue Invoices
              </h3>
              <div className="space-y-2">
                {overdueInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {inv.invoice_number ?? `Invoice #${inv.id}`}
                        {inv.client_name && (
                          <span className="ml-2 text-gray-500">
                            &middot; {inv.client_name}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-red-600">
                        Due {formatDate(inv.due_date)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-red-700">
                      {formatCurrency(inv.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {overdueTasks.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Past-Due Tasks
              </h3>
              <div className="space-y-2">
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {task.title}
                      </p>
                      <p className="text-xs text-red-600">
                        Due {formatDate(task.due_date)}
                        {task.assigned_to && (
                          <span className="ml-2 text-gray-500">
                            &middot; {task.assigned_to}
                          </span>
                        )}
                      </p>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
