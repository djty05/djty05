"use client";

import React from "react";

type Priority = "low" | "medium" | "high" | "urgent";

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

const priorityConfig: Record<Priority, { colors: string; dot: string }> = {
  low: {
    colors: "bg-gray-100 text-gray-700",
    dot: "bg-gray-400",
  },
  medium: {
    colors: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  high: {
    colors: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  urgent: {
    colors: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
};

export default function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const normalizedPriority = priority.toLowerCase().trim() as Priority;
  const config = priorityConfig[normalizedPriority] ?? priorityConfig.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium capitalize ${config.colors} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {normalizedPriority}
    </span>
  );
}
