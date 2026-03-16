"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import DataTable from "@/components/ui/DataTable";
import StatsCard from "@/components/ui/StatsCard";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_point: number;
  unit_cost: number;
  unit_price: number;
  supplier: string;
  location: string;
  [key: string]: unknown;
}

const categoryOptions = [
  { value: "", label: "All Categories" },
  { value: "HVAC", label: "HVAC" },
  { value: "Plumbing", label: "Plumbing" },
  { value: "Electrical", label: "Electrical" },
  { value: "General", label: "General" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

const initialForm = {
  sku: "",
  name: "",
  description: "",
  category: "",
  unit: "each",
  quantity_on_hand: 0,
  reorder_point: 0,
  unit_cost: 0,
  unit_price: 0,
  supplier: "",
  location: "",
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalItems = items.length;
  const totalValue = items.reduce(
    (sum, item) => sum + item.quantity_on_hand * item.unit_cost,
    0
  );
  const lowStockCount = items.filter(
    (item) => item.quantity_on_hand <= item.reorder_point
  ).length;

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const url = editingId ? `/api/inventory/${editingId}` : "/api/inventory";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save item");
      setForm(initialForm);
      setEditingId(null);
      setShowModal(false);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      sku: item.sku || "",
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      unit: item.unit || "each",
      quantity_on_hand: item.quantity_on_hand || 0,
      reorder_point: item.reorder_point || 0,
      unit_cost: item.unit_cost || 0,
      unit_price: item.unit_price || 0,
      supplier: item.supplier || "",
      location: item.location || "",
    });
    setShowModal(true);
  };

  const columns = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    {
      key: "quantity_on_hand",
      label: "Qty On Hand",
      render: (value: unknown, row: Record<string, unknown>) => {
        const qty = value as number;
        const reorder = row.reorder_point as number;
        const isLow = qty <= reorder;
        return (
          <span className={isLow ? "font-semibold text-amber-700" : ""}>
            {qty}
          </span>
        );
      },
    },
    {
      key: "reorder_point",
      label: "Reorder Point",
    },
    {
      key: "unit_cost",
      label: "Unit Cost",
      render: (value: unknown) => formatCurrency(value as number),
    },
    {
      key: "unit_price",
      label: "Unit Price",
      render: (value: unknown) => formatCurrency(value as number),
    },
    {
      key: "id",
      label: "Value",
      render: (_value: unknown, row: Record<string, unknown>) => {
        const qty = row.quantity_on_hand as number;
        const cost = row.unit_cost as number;
        return formatCurrency(qty * cost);
      },
    },
  ];

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(initialForm);
            setShowModal(true);
          }}
        >
          Add Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
          label="Total Items"
          value={totalItems}
        />
        <StatsCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Total Value"
          value={formatCurrency(totalValue)}
          changeType="positive"
        />
        <StatsCard
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
          label="Low Stock Alerts"
          value={lowStockCount}
          changeType={lowStockCount > 0 ? "negative" : "neutral"}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search inventory..."
          className="w-full sm:w-72"
        />
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
          placeholder="All Categories"
          className="w-full sm:w-48"
        />
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={fetchItems}
            className="ml-2 font-medium underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No inventory items found"
          description={
            search || categoryFilter
              ? "Try adjusting your search or filters."
              : "Add your first inventory item to get started."
          }
          action={
            !search && !categoryFilter ? (
              <Button
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                  setShowModal(true);
                }}
              >
                Add Item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
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
              {items.map((item, rowIndex) => {
                const isLowStock = item.quantity_on_hand <= item.reorder_point;
                return (
                  <tr
                    key={item.id}
                    onClick={() => openEdit(item)}
                    className={`cursor-pointer transition-colors duration-100 ${
                      isLowStock
                        ? "bg-amber-50 hover:bg-amber-100/70"
                        : rowIndex % 2 === 1
                          ? "bg-gray-50/50 hover:bg-blue-50/50"
                          : "hover:bg-blue-50/50"
                    }`}
                  >
                    {columns.map((col) => {
                      const value = (item as unknown as Record<string, unknown>)[col.key];
                      return (
                        <td
                          key={col.key}
                          className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                        >
                          {col.render
                            ? col.render(value, item as unknown as Record<string, unknown>)
                            : (value as React.ReactNode) ?? "\u2014"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingId(null);
          setForm(initialForm);
        }}
        title={editingId ? "Edit Item" : "Add Item"}
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
            <Button onClick={handleSubmit} disabled={submitting || !form.name.trim()}>
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Item"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                className={inputClass}
                placeholder="SKU-001"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
                placeholder="Item name"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className={inputClass}
              placeholder="Item description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select category</option>
                <option value="HVAC">HVAC</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Unit</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className={inputClass}
                placeholder="each"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Qty On Hand</label>
              <input
                type="number"
                value={form.quantity_on_hand}
                onChange={(e) => setForm((f) => ({ ...f, quantity_on_hand: Number(e.target.value) }))}
                className={inputClass}
                min={0}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Reorder Point</label>
              <input
                type="number"
                value={form.reorder_point}
                onChange={(e) => setForm((f) => ({ ...f, reorder_point: Number(e.target.value) }))}
                className={inputClass}
                min={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Unit Cost</label>
              <input
                type="number"
                value={form.unit_cost}
                onChange={(e) => setForm((f) => ({ ...f, unit_cost: Number(e.target.value) }))}
                className={inputClass}
                min={0}
                step={0.01}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Unit Price</label>
              <input
                type="number"
                value={form.unit_price}
                onChange={(e) => setForm((f) => ({ ...f, unit_price: Number(e.target.value) }))}
                className={inputClass}
                min={0}
                step={0.01}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Supplier</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                className={inputClass}
                placeholder="Supplier name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className={inputClass}
                placeholder="Warehouse A"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
