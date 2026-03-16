"use client";

import React from "react";

type StatusBadgeSize = "sm" | "md";

interface StatusBadgeProps {
  status: string;
  size?: StatusBadgeSize;
  className?: string;
}

const statusColorMap: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  approved: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  sent: "bg-indigo-100 text-indigo-700",
  overdue: "bg-red-100 text-red-700",
  accepted: "bg-emerald-100 text-emerald-700",
  open: "bg-sky-100 text-sky-700",
};

const sizeClasses: Record<StatusBadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export default function StatusBadge({
  status,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().trim();
  const colorClasses =
    statusColorMap[normalizedStatus] ?? "bg-gray-100 text-gray-700";
  const displayText = normalizedStatus.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium capitalize whitespace-nowrap ${colorClasses} ${sizeClasses[size]} ${className}`}
    >
      {displayText}
    </span>
  );
}
