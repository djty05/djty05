"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div
        className="flex flex-1 flex-col transition-all duration-200 ease-out"
        style={{ marginLeft: sidebarCollapsed ? "4rem" : "16rem" }}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-content-bg p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
