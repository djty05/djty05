"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  description: string;
  status: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  job_id?: string;
  line_items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  valid_until: string;
  created_at: string;
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

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<LineItem[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`);
      if (!res.ok) throw new Error("Failed to fetch quote");
      const data = await res.json();
      setQuote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const startEditing = () => {
    if (!quote) return;
    setEditItems(quote.line_items.map((item) => ({ ...item })));
    setEditNotes(quote.notes || "");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditItems([]);
    setEditNotes("");
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    setEditItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        updated[index].total =
          Number(updated[index].quantity) * Number(updated[index].unit_price);
      }
      return updated;
    });
  };

  const addLineItem = () => {
    setEditItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit_price: 0, total: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const editSubtotal = editItems.reduce((sum, item) => sum + item.total, 0);
  const editTax = editSubtotal * 0.1;
  const editTotal = editSubtotal + editTax;

  const saveEdits = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_items: editItems,
          notes: editNotes,
          subtotal: editSubtotal,
          tax: editTax,
          total: editTotal,
        }),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      const data = await res.json();
      setQuote(data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const sendToClient = async () => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (!res.ok) throw new Error("Failed to send quote");
      const data = await res.json();
      setQuote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    }
  };

  const convertToInvoice = async () => {
    if (!quote) return;
    setConverting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: quote.id,
          client_id: quote.client_id,
          job_id: quote.job_id,
          title: quote.title,
          line_items: quote.line_items,
          subtotal: quote.subtotal,
          tax: quote.tax,
          total: quote.total,
          notes: quote.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      const invoice = await res.json();
      setConvertModalOpen(false);
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert");
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
        <button
          onClick={fetchQuote}
          className="ml-2 font-medium underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="py-16 text-center text-gray-500">Quote not found.</div>
    );
  }

  const displayItems = editing ? editItems : quote.line_items;
  const displaySubtotal = editing ? editSubtotal : quote.subtotal;
  const displayTax = editing ? editTax : quote.tax;
  const displayTotal = editing ? editTotal : quote.total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/quotes")}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {quote.quote_number}
          </h1>
          <StatusBadge status={quote.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button variant="secondary" onClick={cancelEditing}>
                Cancel
              </Button>
              <Button onClick={saveEdits} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={startEditing}>
                Edit
              </Button>
              {(quote.status === "draft" || quote.status === "sent") && (
                <Button variant="secondary" onClick={sendToClient}>
                  Send to Client
                </Button>
              )}
              {quote.status === "accepted" && (
                <Button onClick={() => setConvertModalOpen(true)}>
                  Convert to Invoice
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Client Info */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Client Information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-900">{quote.client_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-900">
              {quote.client_email || "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium text-gray-900">
              {quote.client_phone || "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-medium text-gray-900">
              {quote.client_address || "\u2014"}
            </p>
          </div>
        </div>
      </Card>

      {/* Quote Details */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Line Items
          </h2>
          {editing && (
            <Button size="sm" variant="secondary" onClick={addLineItem}>
              Add Row
            </Button>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total
                </th>
                {editing && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {displayItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={editing ? 5 : 4}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No line items. {editing && "Click 'Add Row' to add one."}
                  </td>
                </tr>
              ) : (
                displayItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {editing ? (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(index, "description", e.target.value)
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        item.description
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              index,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateLineItem(
                              index,
                              "unit_price",
                              Number(e.target.value)
                            )
                          }
                          className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        formatCurrency(item.unit_price)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(item.total)}
                    </td>
                    {editing && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeLineItem(index)}
                          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                            />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(displaySubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax (10%)</span>
              <span>{formatCurrency(displayTax)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(displayTotal)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Notes
        </h2>
        {editing ? (
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {quote.notes || "No notes."}
          </p>
        )}
      </Card>

      {/* Quote Meta */}
      <div className="flex flex-wrap gap-6 text-sm text-gray-500">
        <div>
          <span className="font-medium">Valid Until:</span>{" "}
          {formatDate(quote.valid_until)}
        </div>
        <div>
          <span className="font-medium">Created:</span>{" "}
          {formatDate(quote.created_at)}
        </div>
      </div>

      {/* Convert to Invoice Modal */}
      <Modal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        title="Convert to Invoice"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConvertModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={convertToInvoice} disabled={converting}>
              {converting ? "Converting..." : "Convert"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          This will create a new invoice from quote{" "}
          <span className="font-semibold">{quote.quote_number}</span> with all
          the same line items and totals. Continue?
        </p>
      </Modal>
    </div>
  );
}
