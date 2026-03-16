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

interface Invoice {
  id: string;
  invoice_number: string;
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
  payment_terms: string;
  due_date: string;
  paid_date: string | null;
  created_at: string;
}

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

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paidModalOpen, setPaidModalOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to fetch invoice");
      const data = await res.json();
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const updateStatus = async (status: string, extraFields?: Record<string, unknown>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extraFields }),
      });
      if (!res.ok) throw new Error(`Failed to update invoice`);
      const data = await res.json();
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  const markAsSent = () => updateStatus("sent");

  const markAsPaid = async () => {
    setMarkingPaid(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "paid",
          paid_date: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to mark as paid");
      const data = await res.json();
      setInvoice(data);
      setPaidModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
    } finally {
      setMarkingPaid(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
          onClick={fetchInvoice}
          className="ml-2 font-medium underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="py-16 text-center text-gray-500">Invoice not found.</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header (hidden when printing) */}
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/invoices")}
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
            {invoice.invoice_number}
          </h1>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <Button
              variant="secondary"
              onClick={markAsSent}
              disabled={updating}
            >
              {updating ? "Updating..." : "Mark as Sent"}
            </Button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <Button onClick={() => setPaidModalOpen(true)}>
              Mark as Paid
            </Button>
          )}
          <Button variant="secondary" onClick={handlePrint}>
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Print-friendly Invoice Layout */}
      <div className="print:shadow-none">
        <Card>
          {/* Company Header */}
          <div className="flex flex-col justify-between gap-6 border-b border-gray-200 pb-6 sm:flex-row">
            <div>
              <h2 className="text-2xl font-bold text-blue-600">FieldPro</h2>
              <p className="mt-1 text-sm text-gray-500">
                123 Business Avenue
              </p>
              <p className="text-sm text-gray-500">
                Suite 100, City, ST 12345
              </p>
              <p className="text-sm text-gray-500">
                info@fieldpro.com
              </p>
            </div>
            <div className="text-left sm:text-right">
              <h3 className="text-lg font-bold uppercase text-gray-900">
                Invoice
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                <span className="font-medium">Invoice #:</span>{" "}
                {invoice.invoice_number}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Date:</span>{" "}
                {formatDate(invoice.created_at)}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Due Date:</span>{" "}
                {formatDate(invoice.due_date)}
              </p>
              {invoice.paid_date && (
                <p className="text-sm text-green-600">
                  <span className="font-medium">Paid:</span>{" "}
                  {formatDate(invoice.paid_date)}
                </p>
              )}
            </div>
          </div>

          {/* Bill To */}
          <div className="border-b border-gray-200 py-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Bill To
            </h3>
            <p className="font-medium text-gray-900">{invoice.client_name}</p>
            {invoice.client_email && (
              <p className="text-sm text-gray-600">{invoice.client_email}</p>
            )}
            {invoice.client_phone && (
              <p className="text-sm text-gray-600">{invoice.client_phone}</p>
            )}
            {invoice.client_address && (
              <p className="text-sm text-gray-600">{invoice.client_address}</p>
            )}
          </div>

          {/* Title */}
          {invoice.title && (
            <div className="border-b border-gray-200 py-4">
              <p className="font-medium text-gray-900">{invoice.title}</p>
              {invoice.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {invoice.description}
                </p>
              )}
            </div>
          )}

          {/* Line Items Table */}
          <div className="py-6">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {invoice.line_items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No line items.
                      </td>
                    </tr>
                  ) : (
                    invoice.line_items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(item.total)}
                        </td>
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
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax (10%)</span>
                  <span>{formatCurrency(invoice.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms / Notes */}
          {(invoice.payment_terms || invoice.notes) && (
            <div className="border-t border-gray-200 pt-6">
              {invoice.payment_terms && (
                <div className="mb-4">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Payment Terms
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {invoice.payment_terms}
                  </p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Notes
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Mark as Paid Modal */}
      <Modal
        isOpen={paidModalOpen}
        onClose={() => setPaidModalOpen(false)}
        title="Mark as Paid"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPaidModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={markAsPaid} disabled={markingPaid}>
              {markingPaid ? "Updating..." : "Confirm Payment"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Mark invoice{" "}
          <span className="font-semibold">{invoice.invoice_number}</span> as
          paid? This will set the paid date to today and update the status.
        </p>
      </Modal>
    </div>
  );
}
