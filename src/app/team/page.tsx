"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import DataTable from "@/components/ui/DataTable";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  hourly_rate: number;
  is_active: number;
  avatar_url: string | null;
  created_at: string;
  [key: string]: unknown;
}

interface MemberDetail {
  assigned_jobs: { id: string; title: string; status: string; [key: string]: unknown }[];
  recent_timesheets: { id: string; clock_in: string; clock_out: string; total_hours: number; job_title: string; [key: string]: unknown }[];
  total_hours_month: number;
}

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  project_manager: "bg-blue-100 text-blue-700",
  foreman: "bg-amber-100 text-amber-700",
  field_tech: "bg-green-100 text-green-700",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  project_manager: "Project Manager",
  foreman: "Foreman",
  field_tech: "Field Tech",
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const initialForm = {
  name: "",
  email: "",
  phone: "",
  role: "field_tech",
  hourly_rate: 0,
};

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "project_manager", label: "Project Manager" },
  { value: "foreman", label: "Foreman" },
  { value: "field_tech", label: "Field Tech" },
];

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

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team");
      if (!res.ok) throw new Error("Failed to fetch team");
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const fetchMemberDetail = async (member: TeamMember) => {
    setSelectedMember(member);
    setShowDetailModal(true);
    setDetailLoading(true);
    setMemberDetail(null);
    try {
      const [jobsRes, timesheetsRes] = await Promise.all([
        fetch(`/api/jobs?assigned_to=${member.id}`),
        fetch(`/api/timesheets?user_id=${member.id}`),
      ]);

      const assignedJobs = jobsRes.ok ? await jobsRes.json() : [];
      const timesheets = timesheetsRes.ok ? await timesheetsRes.json() : [];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthTimesheets = timesheets.filter(
        (t: { clock_in: string }) => new Date(t.clock_in) >= startOfMonth
      );
      const totalHoursMonth = monthTimesheets.reduce(
        (sum: number, t: { total_hours: number | null }) => sum + (t.total_hours || 0),
        0
      );

      setMemberDetail({
        assigned_jobs: assignedJobs.slice(0, 10),
        recent_timesheets: timesheets.slice(0, 10),
        total_hours_month: totalHoursMonth,
      });
    } catch {
      setMemberDetail({
        assigned_jobs: [],
        recent_timesheets: [],
        total_hours_month: 0,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    try {
      const url = editingId ? `/api/team/${editingId}` : "/api/team";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save member");
      setForm(initialForm);
      setEditingId(null);
      setShowModal(false);
      fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      role: member.role || "field_tech",
      hourly_rate: member.hourly_rate || 0,
    });
    setShowModal(true);
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  const jobColumns = [
    { key: "title", label: "Title" },
    {
      key: "status",
      label: "Status",
      render: (value: unknown) => <StatusBadge status={value as string} size="sm" />,
    },
  ];

  const timesheetColumns = [
    {
      key: "clock_in",
      label: "Date",
      render: (value: unknown) => formatDate(value as string),
    },
    { key: "job_title", label: "Job" },
    {
      key: "total_hours",
      label: "Hours",
      render: (value: unknown) => formatHours(value as number | null),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(initialForm);
            setShowModal(true);
          }}
        >
          Add Member
        </Button>
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={fetchMembers}
            className="ml-2 font-medium underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          title="No team members"
          description="Add your first team member to get started."
          action={
            <Button
              onClick={() => {
                setEditingId(null);
                setForm(initialForm);
                setShowModal(true);
              }}
            >
              Add Member
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card
              key={member.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
            >
              <div onClick={() => fetchMemberDetail(member)} className="space-y-3">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      roleColors[member.role] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {getInitials(member.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {member.name}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        roleColors[member.role] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {roleLabels[member.role] || member.role}
                    </span>
                  </div>
                  <StatusBadge
                    status={member.is_active ? "active" : "inactive"}
                    size="sm"
                  />
                </div>
                {member.email && (
                  <p className="text-sm text-gray-500 truncate">{member.email}</p>
                )}
                {member.phone && (
                  <p className="text-sm text-gray-500">{member.phone}</p>
                )}
                <div className="flex items-center justify-end pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(member);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Member Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingId(null);
          setForm(initialForm);
        }}
        title={editingId ? "Edit Team Member" : "Add Team Member"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingId(null);
                setForm(initialForm);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.name.trim() || !form.email.trim()}>
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Member"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputClass}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className={inputClass}
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Hourly Rate</label>
            <input
              type="number"
              value={form.hourly_rate}
              onChange={(e) => setForm((f) => ({ ...f, hourly_rate: Number(e.target.value) }))}
              className={inputClass}
              min={0}
              step={0.01}
            />
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMember(null);
          setMemberDetail(null);
        }}
        title={selectedMember?.name || "Team Member"}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : selectedMember && memberDetail ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
                  roleColors[selectedMember.role] || "bg-gray-100 text-gray-700"
                }`}
              >
                {getInitials(selectedMember.name)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedMember.name}
                </h3>
                <p className="text-sm text-gray-500">{selectedMember.email}</p>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-sm font-medium text-blue-700">Hours This Month</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatHours(memberDetail.total_hours_month)}
              </p>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Assigned Jobs</h4>
              {memberDetail.assigned_jobs.length === 0 ? (
                <p className="text-sm text-gray-500">No assigned jobs</p>
              ) : (
                <DataTable
                  columns={jobColumns}
                  data={memberDetail.assigned_jobs as unknown as Record<string, unknown>[]}
                />
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Recent Timesheets</h4>
              {memberDetail.recent_timesheets.length === 0 ? (
                <p className="text-sm text-gray-500">No recent timesheets</p>
              ) : (
                <DataTable
                  columns={timesheetColumns}
                  data={memberDetail.recent_timesheets as unknown as Record<string, unknown>[]}
                />
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
