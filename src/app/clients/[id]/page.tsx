"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import StatsCard from "@/components/ui/StatsCard";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";

interface Client {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  notes: string;
  recent_jobs: Job[];
  [key: string]: unknown;
}

interface Job {
  id: string;
  job_number: string;
  title: string;
  status: string;
  start_date: string;
  due_date: string;
  [key: string]: unknown;
}

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  status: string;
  total: number;
  created_at: string;
  [key: string]: unknown;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  due_date: string;
  created_at: string;
  [key: string]: unknown;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

const formatDate = (dateStr: string) => {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface Tender {
  id: string;
  tender_number: string;
  title: string;
  status: string;
  stage: string;
  estimated_value: number;
  submission_deadline: string;
  [key: string]: unknown;
}

interface FollowUp {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  priority: string;
  entity_type: string;
  [key: string]: unknown;
}

type Tab = "jobs" | "quotes" | "invoices" | "tenders" | "follow_ups";

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("jobs");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
    status: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Failed to fetch client");
      const data = await res.json();
      setClient(data);
      setJobs(data.recent_jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTabData = useCallback(
    async (tab: Tab) => {
      setTabLoading(true);
      try {
        if (tab === "jobs") {
          const res = await fetch(`/api/jobs?client_id=${id}`);
          if (res.ok) {
            const data = await res.json();
            setJobs(data);
          }
        } else if (tab === "quotes") {
          const res = await fetch(`/api/quotes?client_id=${id}`);
          if (res.ok) {
            const data = await res.json();
            setQuotes(data);
          }
        } else if (tab === "invoices") {
          const res = await fetch(`/api/invoices?client_id=${id}`);
          if (res.ok) {
            const data = await res.json();
            setInvoices(data);
          }
        } else if (tab === "tenders") {
          const res = await fetch(`/api/tenders?client_id=${id}`);
          if (res.ok) {
            const data = await res.json();
            setTenders(Array.isArray(data) ? data : []);
          }
        } else if (tab === "follow_ups") {
          const res = await fetch(`/api/follow-ups?entity_type=client&entity_id=${id}`);
          if (res.ok) {
            const data = await res.json();
            setFollowUps(Array.isArray(data) ? data : []);
          }
        }
      } catch {
        // Silently fail for tab data
      } finally {
        setTabLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  const handleEdit = () => {
    if (!client) return;
    setEditForm({
      company_name: client.company_name || "",
      contact_name: client.contact_name || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      zip: client.zip || "",
      notes: client.notes || "",
      status: client.status || "active",
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to update client");
      setShowEditModal(false);
      fetchClient();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const totalJobs = jobs.length;
  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const outstandingBalance = invoices
    .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  const jobColumns = [
    { key: "job_number", label: "Job #" },
    { key: "title", label: "Title" },
    {
      key: "status",
      label: "Status",
      render: (value: unknown) => <StatusBadge status={value as string} size="sm" />,
    },
    {
      key: "start_date",
      label: "Start Date",
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "due_date",
      label: "Due Date",
      render: (value: unknown) => formatDate(value as string),
    },
  ];

  const quoteColumns = [
    { key: "quote_number", label: "Quote #" },
    { key: "title", label: "Title" },
    {
      key: "status",
      label: "Status",
      render: (value: unknown) => <StatusBadge status={value as string} size="sm" />,
    },
    {
      key: "total",
      label: "Total",
      render: (value: unknown) => (
        <span className="font-medium">{formatCurrency(value as number)}</span>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (value: unknown) => formatDate(value as string),
    },
  ];

  const invoiceColumns = [
    { key: "invoice_number", label: "Invoice #" },
    {
      key: "status",
      label: "Status",
      render: (value: unknown) => <StatusBadge status={value as string} size="sm" />,
    },
    {
      key: "total",
      label: "Total",
      render: (value: unknown) => (
        <span className="font-medium">{formatCurrency(value as number)}</span>
      ),
    },
    {
      key: "due_date",
      label: "Due Date",
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "created_at",
      label: "Created",
      render: (value: unknown) => formatDate(value as string),
    },
  ];

  const tenderColumns = [
    { key: "tender_number", label: "Tender #" },
    { key: "title", label: "Title" },
    {
      key: "stage",
      label: "Stage",
      render: (value: unknown) => <StatusBadge status={value as string} size="sm" />,
    },
    {
      key: "estimated_value",
      label: "Est. Value",
      render: (value: unknown) => (
        <span className="font-medium">{formatCurrency(value as number)}</span>
      ),
    },
    {
      key: "submission_deadline",
      label: "Deadline",
      render: (value: unknown) => formatDate(value as string),
    },
  ];

  const followUpColumns = [
    { key: "title", label: "Title" },
    { key: "entity_type", label: "Related To" },
    {
      key: "status",
      label: "Status",
      render: (value: unknown) => <StatusBadge status={value as string} size="sm" />,
    },
    { key: "priority", label: "Priority" },
    {
      key: "due_date",
      label: "Due Date",
      render: (value: unknown) => formatDate(value as string),
    },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "jobs", label: "Jobs" },
    { key: "quotes", label: "Quotes" },
    { key: "invoices", label: "Invoices" },
    { key: "tenders", label: "Tenders" },
    { key: "follow_ups", label: "Follow-ups" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "Client not found"}
          <button
            onClick={fetchClient}
            className="ml-2 font-medium underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
        <Button variant="secondary" onClick={() => router.push("/clients")}>
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/clients")}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {client.company_name}
          </h1>
          <StatusBadge status={client.status || "active"} />
        </div>
        <Button onClick={handleEdit}>Edit</Button>
      </div>

      {/* Contact Info */}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Contact Name</p>
            <p className="mt-1 text-sm text-gray-900">
              {client.contact_name || "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="mt-1 text-sm text-gray-900">
              {client.email || "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Phone</p>
            <p className="mt-1 text-sm text-gray-900">
              {client.phone || "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Address</p>
            <p className="mt-1 text-sm text-gray-900">
              {[client.address, client.city, client.state]
                .filter(Boolean)
                .join(", ") || "\u2014"}
              {client.zip ? ` ${client.zip}` : ""}
            </p>
          </div>
        </div>
        {client.notes && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-500">Notes</p>
            <p className="mt-1 text-sm text-gray-700">{client.notes}</p>
          </div>
        )}
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          }
          label="Total Jobs"
          value={totalJobs}
        />
        <StatsCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          changeType="positive"
        />
        <StatsCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
          label="Outstanding Balance"
          value={formatCurrency(outstandingBalance)}
          changeType={outstandingBalance > 0 ? "negative" : "neutral"}
        />
      </div>

      {/* Tabs */}
      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`border-b-2 pb-3 pt-2 text-sm font-medium transition-colors ${
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

        <div className="mt-4">
          {tabLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            </div>
          ) : activeTab === "jobs" ? (
            jobs.length === 0 ? (
              <EmptyState title="No jobs found" description="No jobs associated with this client yet." />
            ) : (
              <DataTable
                columns={jobColumns}
                data={jobs as unknown as Record<string, unknown>[]}
                onRowClick={(row) => router.push(`/jobs/${row.id}`)}
              />
            )
          ) : activeTab === "quotes" ? (
            quotes.length === 0 ? (
              <EmptyState title="No quotes found" description="No quotes for this client yet." />
            ) : (
              <DataTable
                columns={quoteColumns}
                data={quotes as unknown as Record<string, unknown>[]}
                onRowClick={(row) => router.push(`/quotes/${row.id}`)}
              />
            )
          ) : activeTab === "invoices" ? (
            invoices.length === 0 ? (
              <EmptyState title="No invoices found" description="No invoices for this client yet." />
            ) : (
              <DataTable
                columns={invoiceColumns}
                data={invoices as unknown as Record<string, unknown>[]}
                onRowClick={(row) => router.push(`/invoices/${row.id}`)}
              />
            )
          ) : activeTab === "tenders" ? (
            tenders.length === 0 ? (
              <EmptyState title="No tenders found" description="No tenders for this client yet." />
            ) : (
              <DataTable
                columns={tenderColumns}
                data={tenders as unknown as Record<string, unknown>[]}
                onRowClick={(row) => router.push(`/tenders/${row.id}`)}
              />
            )
          ) : followUps.length === 0 ? (
            <EmptyState title="No follow-ups" description="No follow-ups for this client yet." />
          ) : (
            <DataTable
              columns={followUpColumns}
              data={followUps as unknown as Record<string, unknown>[]}
            />
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Client"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Company Name *</label>
            <input
              type="text"
              value={editForm.company_name}
              onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Contact Name</label>
            <input
              type="text"
              value={editForm.contact_name}
              onChange={(e) => setEditForm((f) => ({ ...f, contact_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">State</label>
              <input
                type="text"
                value={editForm.state}
                onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Zip</label>
              <input
                type="text"
                value={editForm.zip}
                onChange={(e) => setEditForm((f) => ({ ...f, zip: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
