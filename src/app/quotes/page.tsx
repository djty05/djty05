"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  client_name: string;
  status: string;
  total: number;
  valid_until: string;
  created_at: string;
  [key: string]: unknown;
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

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

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/quotes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch quotes");
      const data = await res.json();
      setQuotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const columns = [
    { key: "quote_number", label: "Quote #" },
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
      key: "valid_until",
      label: "Valid Until",
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "created_at",
      label: "Created",
      render: (value: unknown) => formatDate(value as string),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <Button onClick={() => router.push("/quotes/create")}>
          New Quote
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search quotes..."
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
            onClick={fetchQuotes}
            className="ml-2 font-medium underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </div>
      ) : quotes.length === 0 ? (
        <EmptyState
          title="No quotes found"
          description={
            search || statusFilter
              ? "Try adjusting your search or filters."
              : "Create your first quote to get started."
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => router.push("/quotes/create")}>
                New Quote
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={quotes as unknown as Record<string, unknown>[]}
          onRowClick={(row) => router.push(`/quotes/${row.id}`)}
        />
      )}
    </div>
  );
}
