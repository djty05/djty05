"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import DataTable from "@/components/ui/DataTable";
import StatsCard from "@/components/ui/StatsCard";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

interface Timesheet {
  id: string;
  user_id: string;
  user_name: string;
  job_id: string;
  job_title: string;
  task_id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  notes: string;
  status: string;
  latitude_in: number | null;
  longitude_in: number | null;
  [key: string]: unknown;
}

interface Job {
  id: string;
  title: string;
  job_number: string;
  [key: string]: unknown;
}

interface User {
  id: string;
  name: string;
  [key: string]: unknown;
}

const formatTime = (dateStr: string | null) => {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatHours = (hours: number | null) => {
  if (hours === null || hours === undefined) return "\u2014";
  return `${hours.toFixed(1)}h`;
};

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  // Clock in/out state
  const [clockedIn, setClockedIn] = useState(false);
  const [activeTimesheet, setActiveTimesheet] = useState<Timesheet | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clock in modal
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [clockInForm, setClockInForm] = useState({
    job_id: "",
    task_id: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTimesheets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (userFilter) params.set("user_id", userFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/timesheets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch timesheets");
      const data = await res.json();
      setTimesheets(data);

      // Check if any entry is currently clocked in (no clock_out)
      const active = data.find((t: Timesheet) => !t.clock_out);
      if (active) {
        setClockedIn(true);
        setActiveTimesheet(active);
        const start = new Date(active.clock_in).getTime();
        setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [userFilter, statusFilter]);

  const fetchUsersAndJobs = useCallback(async () => {
    try {
      const [usersRes, jobsRes] = await Promise.all([
        fetch("/api/team"),
        fetch("/api/jobs"),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchTimesheets();
    fetchUsersAndJobs();
  }, [fetchTimesheets, fetchUsersAndJobs]);

  // Timer effect
  useEffect(() => {
    if (clockedIn && activeTimesheet) {
      timerRef.current = setInterval(() => {
        const start = new Date(activeTimesheet.clock_in).getTime();
        setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clockedIn, activeTimesheet]);

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleClockIn = async () => {
    if (!clockInForm.job_id) return;
    setSubmitting(true);
    try {
      let lat: number | null = null;
      let lon: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        // Geolocation not available or denied
      }

      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: users[0]?.id || null,
          job_id: clockInForm.job_id,
          task_id: clockInForm.task_id || null,
          clock_in: new Date().toISOString(),
          notes: clockInForm.notes || null,
          latitude_in: lat,
          longitude_in: lon,
          status: "pending",
        }),
      });
      if (!res.ok) throw new Error("Failed to clock in");
      setShowClockInModal(false);
      setClockInForm({ job_id: "", task_id: "", notes: "" });
      fetchTimesheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clock in");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeTimesheet) return;
    setSubmitting(true);
    try {
      let lat: number | null = null;
      let lon: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        // Geolocation not available
      }

      const clockOut = new Date().toISOString();
      const clockIn = new Date(activeTimesheet.clock_in).getTime();
      const totalHours = (Date.now() - clockIn) / (1000 * 60 * 60);

      const res = await fetch(`/api/timesheets/${activeTimesheet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clock_out: clockOut,
          total_hours: Math.round(totalHours * 100) / 100,
          latitude_out: lat,
          longitude_out: lon,
        }),
      });
      if (!res.ok) throw new Error("Failed to clock out");
      setClockedIn(false);
      setActiveTimesheet(null);
      setElapsedSeconds(0);
      fetchTimesheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clock out");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/timesheets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      fetchTimesheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  // Calculate weekly and monthly hours
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const hoursThisWeek = timesheets
    .filter((t) => t.clock_in && new Date(t.clock_in) >= startOfWeek)
    .reduce((sum, t) => sum + (t.total_hours || 0), 0);

  const hoursThisMonth = timesheets
    .filter((t) => t.clock_in && new Date(t.clock_in) >= startOfMonth)
    .reduce((sum, t) => sum + (t.total_hours || 0), 0);

  const userOptions = [
    { value: "", label: "All Users" },
    ...users.map((u) => ({ value: u.id, label: u.name })),
  ];

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
  ];

  const columns = [
    {
      key: "clock_in",
      label: "Date",
      render: (value: unknown) => formatDate(value as string),
    },
    { key: "user_name", label: "User" },
    { key: "job_title", label: "Job" },
    {
      key: "clock_in",
      label: "Clock In",
      render: (value: unknown) => formatTime(value as string),
    },
    {
      key: "clock_out",
      label: "Clock Out",
      render: (value: unknown) => formatTime(value as string | null),
    },
    {
      key: "total_hours",
      label: "Hours",
      render: (value: unknown) => formatHours(value as number | null),
    },
    {
      key: "status",
      label: "Status",
      render: (value: unknown) => <StatusBadge status={value as string} size="sm" />,
    },
    {
      key: "id",
      label: "Actions",
      render: (_value: unknown, row: Record<string, unknown>) =>
        row.status === "pending" ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleApprove(row.id as string);
            }}
          >
            Approve
          </Button>
        ) : null,
    },
  ];

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
      </div>

      {/* Active Clock */}
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
        {clockedIn && activeTimesheet ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-500">Currently Clocked In</p>
            <p className="text-4xl font-bold font-mono text-blue-600">
              {formatElapsed(elapsedSeconds)}
            </p>
            <p className="text-sm text-gray-600">
              Job: {activeTimesheet.job_title || "Unknown"}
            </p>
            <Button
              variant="danger"
              size="lg"
              onClick={handleClockOut}
              disabled={submitting}
            >
              {submitting ? "Clocking Out..." : "Clock Out"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-500">Not Clocked In</p>
            <Button
              size="lg"
              onClick={() => setShowClockInModal(true)}
            >
              Clock In
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Hours This Week"
          value={formatHours(hoursThisWeek)}
        />
        <StatsCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
          label="Hours This Month"
          value={formatHours(hoursThisMonth)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={userFilter}
          onChange={setUserFilter}
          options={userOptions}
          placeholder="All Users"
          className="w-full sm:w-48"
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          placeholder="All Statuses"
          className="w-full sm:w-48"
        />
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={fetchTimesheets}
            className="ml-2 font-medium underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </div>
      ) : timesheets.length === 0 ? (
        <EmptyState
          title="No timesheets found"
          description={
            userFilter || statusFilter
              ? "Try adjusting your filters."
              : "Clock in to start tracking time."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={timesheets as unknown as Record<string, unknown>[]}
        />
      )}

      {/* Clock In Modal */}
      <Modal
        isOpen={showClockInModal}
        onClose={() => setShowClockInModal(false)}
        title="Clock In"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowClockInModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleClockIn} disabled={submitting || !clockInForm.job_id}>
              {submitting ? "Clocking In..." : "Clock In"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Job *</label>
            <select
              value={clockInForm.job_id}
              onChange={(e) => setClockInForm((f) => ({ ...f, job_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">Select a job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.job_number ? `${job.job_number} - ` : ""}{job.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Task (optional)</label>
            <input
              type="text"
              value={clockInForm.task_id}
              onChange={(e) => setClockInForm((f) => ({ ...f, task_id: e.target.value }))}
              className={inputClass}
              placeholder="Task description"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              value={clockInForm.notes}
              onChange={(e) => setClockInForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className={inputClass}
              placeholder="Additional notes..."
            />
          </div>
          <p className="text-xs text-gray-400">
            Your current location will be captured automatically.
          </p>
        </div>
      </Modal>
    </div>
  );
}
