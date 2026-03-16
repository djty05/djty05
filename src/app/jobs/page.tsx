"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import PriorityBadge from "@/components/ui/PriorityBadge";
import EmptyState from "@/components/ui/EmptyState";

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
  [key: string]: unknown;
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

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const priorityOptions = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs");
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.job_number.toLowerCase().includes(search.toLowerCase()) ||
        (job.client_name ?? job.client?.name ?? "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus = !statusFilter || job.status === statusFilter;
      const matchesPriority =
        !priorityFilter || job.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [jobs, search, statusFilter, priorityFilter]);

  const columns = [
    {
      key: "job_number",
      label: "Job #",
      render: (value: unknown) => (
        <span className="font-medium text-blue-600">{value as string}</span>
      ),
    },
    {
      key: "title",
      label: "Title",
      render: (value: unknown) => (
        <span className="font-medium text-gray-900">{value as string}</span>
      ),
    },
    {
      key: "client_name",
      label: "Client",
      render: (_value: unknown, row: Job) =>
        (row.client_name ?? row.client?.name ?? "\u2014") as React.ReactNode,
    },
    {
      key: "status",
      label: "Status",
      render: (value: unknown) => <StatusBadge status={value as string} size="sm" />,
    },
    {
      key: "priority",
      label: "Priority",
      render: (value: unknown) => <PriorityBadge priority={value as string} />,
    },
    {
      key: "due_date",
      label: "Due Date",
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "assigned_to",
      label: "Assigned To",
      render: (value: unknown) => (value as string) ?? "\u2014",
    },
  ];

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Failed to load jobs</p>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <Button
          onClick={() => router.push("/jobs/create")}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
        >
          New Job
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search jobs..."
          className="w-full sm:w-72"
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          placeholder=""
          className="w-full sm:w-44"
        />
        <Select
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={priorityOptions}
          placeholder=""
          className="w-full sm:w-44"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : filteredJobs.length === 0 && jobs.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          }
          title="No jobs yet"
          description="Create your first job to get started."
          action={
            <Button onClick={() => router.push("/jobs/create")}>
              Create Job
            </Button>
          }
        />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          title="No matching jobs"
          description="Try adjusting your search or filters."
        />
      ) : (
        <DataTable<Record<string, unknown>>
          columns={columns as { key: string; label: string; render?: (value: unknown, row: Record<string, unknown>, index: number) => React.ReactNode }[]}
          data={filteredJobs as unknown as Record<string, unknown>[]}
          onRowClick={(row) => router.push(`/jobs/${row.id}`)}
          emptyMessage="No jobs found"
        />
      )}
    </div>
  );
}
