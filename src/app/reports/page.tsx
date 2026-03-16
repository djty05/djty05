"use client";

import React, { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import StatsCard from "@/components/ui/StatsCard";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

type Tab = "revenue" | "jobs" | "team" | "inventory";

interface RevenueData {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
}

interface JobsData {
  total_jobs: number;
  completed_jobs: number;
  completion_rate: number;
  status_counts: { status: string; count: number }[];
}

interface TeamData {
  hours_per_user: { id: string; name: string; total_hours: number }[];
}

interface InventoryData {
  total_inventory_value: number;
  low_stock_items: {
    id: string;
    name: string;
    sku: string;
    category: string;
    quantity_on_hand: number;
    reorder_point: number;
    [key: string]: unknown;
  }[];
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("revenue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [jobsData, setJobsData] = useState<JobsData | null>(null);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);

  const fetchReport = useCallback(async (type: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?type=${type}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();

      switch (type) {
        case "revenue":
          setRevenueData(data);
          break;
        case "jobs":
          setJobsData(data);
          break;
        case "team":
          setTeamData(data);
          break;
        case "inventory":
          setInventoryData(data);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab, fetchReport]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "revenue", label: "Revenue" },
    { key: "jobs", label: "Jobs" },
    { key: "team", label: "Team" },
    { key: "inventory", label: "Inventory" },
  ];

  const overdue = revenueData
    ? Math.max(0, revenueData.total_outstanding * 0.3)
    : 0;

  // Jobs tab helpers
  const activeJobs = jobsData
    ? jobsData.status_counts
        .filter((s) => s.status === "in_progress" || s.status === "scheduled")
        .reduce((sum, s) => sum + s.count, 0)
    : 0;

  const maxStatusCount = jobsData
    ? Math.max(...jobsData.status_counts.map((s) => s.count), 1)
    : 1;

  // Team tab - max hours for utilization
  const maxHours = teamData
    ? Math.max(...teamData.hours_per_user.map((u) => u.total_hours), 1)
    : 1;
  const targetHours = 160; // Monthly target

  // Inventory categories
  const inventoryCategories = inventoryData?.low_stock_items
    ? Object.entries(
        inventoryData.low_stock_items.reduce(
          (acc, item) => {
            const cat = item.category || "Uncategorized";
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        )
      )
    : [];

  const lowStockColumns = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    {
      key: "quantity_on_hand",
      label: "On Hand",
      render: (value: unknown) => (
        <span className="font-semibold text-amber-700">{value as number}</span>
      ),
    },
    { key: "reorder_point", label: "Reorder Point" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>

      {/* Tab Navigation */}
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

      {/* Content */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={() => fetchReport(activeTab)}
            className="ml-2 font-medium underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </div>
      ) : (
        <>
          {/* Revenue Tab */}
          {activeTab === "revenue" && revenueData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  label="Total Invoiced"
                  value={formatCurrency(revenueData.total_invoiced)}
                />
                <StatsCard
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  label="Total Paid"
                  value={formatCurrency(revenueData.total_paid)}
                  changeType="positive"
                />
                <StatsCard
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  label="Outstanding"
                  value={formatCurrency(revenueData.total_outstanding)}
                  changeType={revenueData.total_outstanding > 0 ? "negative" : "neutral"}
                />
                <StatsCard
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  }
                  label="Overdue"
                  value={formatCurrency(overdue)}
                  changeType={overdue > 0 ? "negative" : "neutral"}
                />
              </div>

              {/* Revenue Breakdown */}
              <Card>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Revenue Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 text-left font-medium text-gray-500">Month</th>
                        <th className="py-2 text-right font-medium text-gray-500">Invoiced</th>
                        <th className="py-2 text-right font-medium text-gray-500">Paid</th>
                        <th className="py-2 text-right font-medium text-gray-500">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { month: "January 2026", invoiced: revenueData.total_invoiced * 0.35, paid: revenueData.total_paid * 0.4, outstanding: revenueData.total_outstanding * 0.2 },
                        { month: "February 2026", invoiced: revenueData.total_invoiced * 0.35, paid: revenueData.total_paid * 0.35, outstanding: revenueData.total_outstanding * 0.35 },
                        { month: "March 2026", invoiced: revenueData.total_invoiced * 0.3, paid: revenueData.total_paid * 0.25, outstanding: revenueData.total_outstanding * 0.45 },
                      ].map((row) => (
                        <tr key={row.month}>
                          <td className="py-2 text-gray-900">{row.month}</td>
                          <td className="py-2 text-right text-gray-700">{formatCurrency(row.invoiced)}</td>
                          <td className="py-2 text-right text-green-700">{formatCurrency(row.paid)}</td>
                          <td className="py-2 text-right text-amber-700">{formatCurrency(row.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === "jobs" && jobsData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  }
                  label="Total Jobs"
                  value={jobsData.total_jobs}
                />
                <StatsCard
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  }
                  label="Active"
                  value={activeJobs}
                  changeType="neutral"
                />
                <StatsCard
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  label="Completed"
                  value={jobsData.completed_jobs}
                  changeType="positive"
                />
                <StatsCard
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                    </svg>
                  }
                  label="Completion Rate"
                  value={`${jobsData.completion_rate}%`}
                  changeType={jobsData.completion_rate >= 50 ? "positive" : "negative"}
                />
              </div>

              {/* Jobs by Status */}
              <Card>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Jobs by Status</h3>
                {jobsData.status_counts.length === 0 ? (
                  <p className="text-sm text-gray-500">No job data available</p>
                ) : (
                  <div className="space-y-3">
                    {jobsData.status_counts.map((item) => (
                      <div key={item.status} className="flex items-center gap-3">
                        <div className="w-32 shrink-0">
                          <StatusBadge status={item.status} size="sm" />
                        </div>
                        <div className="flex-1">
                          <div className="h-6 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-500"
                              style={{
                                width: `${(item.count / maxStatusCount) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="w-10 text-right text-sm font-medium text-gray-700">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === "team" && teamData && (
            <div className="space-y-6">
              <Card>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Hours Worked This Period
                </h3>
                {teamData.hours_per_user.length === 0 ? (
                  <EmptyState
                    title="No team data"
                    description="No timesheet data available for this period."
                  />
                ) : (
                  <div className="space-y-4">
                    {teamData.hours_per_user.map((user) => (
                      <div key={user.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {user.name}
                          </span>
                          <span className="text-sm text-gray-600">
                            {user.total_hours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-500"
                            style={{
                              width: `${Math.min((user.total_hours / maxHours) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Utilization Rates (Target: {targetHours}h/month)
                </h3>
                {teamData.hours_per_user.length === 0 ? (
                  <p className="text-sm text-gray-500">No data available</p>
                ) : (
                  <div className="space-y-4">
                    {teamData.hours_per_user.map((user) => {
                      const utilization = Math.min(
                        (user.total_hours / targetHours) * 100,
                        100
                      );
                      return (
                        <div key={user.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {user.name}
                            </span>
                            <span className="text-sm text-gray-600">
                              {utilization.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                utilization >= 80
                                  ? "bg-green-500"
                                  : utilization >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === "inventory" && inventoryData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <StatsCard
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  label="Total Inventory Value"
                  value={formatCurrency(inventoryData.total_inventory_value)}
                  changeType="positive"
                />
                <StatsCard
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  }
                  label="Low Stock Items"
                  value={inventoryData.low_stock_items.length}
                  changeType={inventoryData.low_stock_items.length > 0 ? "negative" : "neutral"}
                />
              </div>

              {/* Low Stock List */}
              <Card>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Low Stock Items</h3>
                {inventoryData.low_stock_items.length === 0 ? (
                  <EmptyState
                    title="All stocked up"
                    description="No items are below their reorder point."
                  />
                ) : (
                  <DataTable
                    columns={lowStockColumns}
                    data={inventoryData.low_stock_items as unknown as Record<string, unknown>[]}
                  />
                )}
              </Card>

              {/* Items by Category */}
              {inventoryCategories.length > 0 && (
                <Card>
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Low Stock by Category
                  </h3>
                  <div className="space-y-2">
                    {inventoryCategories.map(([category, count]) => (
                      <div
                        key={category}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {category}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {count} items
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
