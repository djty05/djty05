"use client";

import React from "react";

type ChangeType = "positive" | "negative" | "neutral";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  changeType?: ChangeType;
  className?: string;
}

const changeColors: Record<ChangeType, string> = {
  positive: "text-green-600",
  negative: "text-red-600",
  neutral: "text-gray-500",
};

const iconBgColors: Record<ChangeType, string> = {
  positive: "bg-green-50 text-green-600",
  negative: "bg-red-50 text-red-600",
  neutral: "bg-blue-50 text-blue-600",
};

export default function StatsCard({
  icon,
  label,
  value,
  change,
  changeType = "neutral",
  className = "",
}: StatsCardProps) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBgColors[changeType]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-500">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <span className={`text-sm font-medium ${changeColors[changeType]}`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
