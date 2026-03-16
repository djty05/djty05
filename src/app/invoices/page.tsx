"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

interface Invoice {
  id: string;
  invoice_number: string;
  title: string;
  client_name: string;
  status: string;
  total: number;
  due_date: string;
  paid_date: string | null;
  created_at: string;
  [key: string]: unknown;
}

interface InvoiceSummary {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  total_overdue: number;
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const DollarIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

const AlertIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
    />
  </svg>
);

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary>({
    total_invoiced: 0,
    total_paid: 0,
    total_outstanding: 0,
    total_overdue: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data = await res.json();
      const invoiceList: Invoice[] = Array.isArray(data)
        ? data
        : data.invoices || [];
      setInvoices(invoiceList);

      // Calculate summary from data
      if (data.summary) {
        setSummary(data.summary);
      } else {
        const totInvoiced = invoiceList.reduce((s, i) => s + i.total, 0);
        const totPaid = invoiceList
          .filter((i) => i.status === "paid")
          .reduce((s, i) => s + i.total, 0);
        const totOverdue = invoiceList
          .filter((i) => i.status === "overdue")
          .reduce((s, i) => s + i.total, 0);
        const totOutstanding = invoiceList
          .filter((i) => i.status !== "paid" && i.status !== "cancelled")
          .reduce((s, i) => s + i.total, 0);
        setSummary({
          total_invoiced: totInvoiced,
          total_paid: totPaid,
          total_outstanding: totOutstanding,
          total_overdue: totOverdue,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const columns = [
    { key: "invoice_number", label: "Invoice #" },
    { key: "title", label: "Title" },
    { key: "client_name", label: "Client" },
    {
      key: "status",
      label: "Status",
      render: (value: unknown) => (
        <StatusBadge status={value as string} size="sm" />
      ),
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
      key: "paid_date",
      label: "Paid Date",
      render: (value: unknown) => formatDate(value as string | null),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <Button onClick={() => router.push("/invoices/create")}>
          New Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <DollarIcon />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-500">
              Total Invoiced
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.total_invoiced)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckIcon />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-500">Paid</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.total_paid)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <ClockIcon />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-500">
              Outstanding
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.total_outstanding)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertIcon />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-500">
              Overdue
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.total_overdue)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search invoices..."
          className="w-full sm:w-72"
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
            onClick={fetchInvoices}
            className="ml-2 font-medium underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description={
            search || statusFilter
              ? "Try adjusting your search or filters."
              : "Create your first invoice to get started."
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => router.push("/invoices/create")}>
                New Invoice
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {invoices.map((invoice, rowIndex) => (
                <tr
                  key={invoice.id}
                  onClick={() => router.push(`/invoices/${invoice.id}`)}
                  className={`cursor-pointer transition-colors duration-100 hover:bg-blue-50/50 ${
                    invoice.status === "overdue" ? "bg-red-50" : rowIndex % 2 === 1 ? "bg-gray-50/50" : ""
                  }`}
                >
                  {columns.map((col) => {
                    const value = invoice[col.key];
                    return (
                      <td
                        key={col.key}
                        className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                      >
                        {col.render
                          ? col.render(value)
                          : (value as React.ReactNode) ?? "\u2014"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
