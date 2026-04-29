"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import PriorityBadge from "@/components/ui/PriorityBadge";
import Modal from "@/components/ui/Modal";

interface Plan { id: string; name: string; job_id: string; sheet_number: string; version: number; notes: string; job_title?: string; }
interface Task { id: string; task_number: string; title: string; description: string; status: string; priority: string; assigned_to: string; pin_x: number; pin_y: number; plan_id: string; due_date: string; }
interface TeamMember { id: string; name: string; }
interface Markup { id: string; type: string; x: number; y: number; text?: string; color: string; w?: number; h?: number; }

type Tool = "select" | "pin" | "text" | "arrow" | "cloud" | "rect" | "measure";

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#111827"];
const STATUS_COLORS: Record<string, string> = { open: "#3b82f6", in_progress: "#f59e0b", completed: "#22c55e", blocked: "#ef4444" };

export default function PlanViewerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const canvasRef = useRef<HTMLDivElement>(null);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#3b82f6");
  const [markups, setMarkups] = useState<Markup[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"tasks" | "markups">("tasks");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newPin, setNewPin] = useState<{ x: number; y: number } | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", assigned_to: "", due_date: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [planRes, tasksRes, teamRes] = await Promise.all([
      fetch(`/api/plans/${id}`), fetch(`/api/tasks?plan_id=${id}`), fetch("/api/team"),
    ]);
    if (planRes.ok) setPlan(await planRes.json());
    if (tasksRes.ok) { const d = await tasksRes.json(); setTasks(Array.isArray(d) ? d : []); }
    if (teamRes.ok) { const d = await teamRes.json(); setTeam(Array.isArray(d) ? d : []); }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(s => Math.min(4, Math.max(0.25, s + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === "select" || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool === "select" || isPanning) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;

    if (tool === "pin") {
      setNewPin({ x, y });
      setShowTaskModal(true);
    } else {
      const mk: Markup = { id: crypto.randomUUID(), type: tool, x, y, color, text: tool === "text" ? "Text" : undefined, w: tool === "rect" ? 120 : undefined, h: tool === "rect" ? 80 : undefined };
      setMarkups([...markups, mk]);
    }
  };

  const createTask = async () => {
    if (!taskForm.title.trim() || !newPin) return;
    const res = await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, plan_id: id, pin_x: newPin.x, pin_y: newPin.y, job_id: plan?.job_id }),
    });
    if (res.ok) { setShowTaskModal(false); setNewPin(null); setTaskForm({ title: "", description: "", priority: "medium", assigned_to: "", due_date: "" }); setTool("select"); fetchData(); }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchData();
    if (selectedTask?.id === taskId) setSelectedTask({ ...selectedTask, status });
  };

  const tools: { key: Tool; label: string; icon: string }[] = [
    { key: "select", label: "Select", icon: "M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" },
    { key: "pin", label: "Add Task", icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" },
    { key: "text", label: "Text", icon: "M4 7V4h16v3M9 20h6M12 4v16" },
    { key: "arrow", label: "Arrow", icon: "M5 12h14M12 5l7 7-7 7" },
    { key: "cloud", label: "Cloud", icon: "M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" },
    { key: "rect", label: "Rectangle", icon: "M3 3h18v18H3z" },
    { key: "measure", label: "Measure", icon: "M2 12h20M2 12l4-4M2 12l4 4M22 12l-4-4M22 12l-4 4" },
  ];

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" /></div>;
  if (!plan) return <div className="flex h-screen items-center justify-center text-gray-500">Plan not found</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-gray-100">
      {/* Top Bar */}
      <div className="flex h-12 items-center justify-between border-b bg-white px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/plans")} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <div>
            <span className="text-sm font-semibold text-gray-900">{plan.name}</span>
            {plan.sheet_number && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">Sheet {plan.sheet_number}</span>}
          </div>
          {plan.job_title && <span className="text-xs text-gray-400">• {plan.job_title}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">v{plan.version}</span>
          <div className="flex items-center gap-1 rounded-lg border px-2 py-1">
            <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className="text-gray-500 hover:text-gray-700">−</button>
            <span className="w-12 text-center text-xs font-medium">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(4, s + 0.25))} className="text-gray-500 hover:text-gray-700">+</button>
          </div>
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">Fit</button>
          <button onClick={() => setShowSidebar(!showSidebar)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" /></svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {showSidebar && (
          <div className="flex w-72 flex-col border-r bg-white">
            <div className="flex border-b">
              <button onClick={() => setSidebarTab("tasks")} className={`flex-1 px-3 py-2.5 text-xs font-semibold ${sidebarTab === "tasks" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}>Tasks ({tasks.length})</button>
              <button onClick={() => setSidebarTab("markups")} className={`flex-1 px-3 py-2.5 text-xs font-semibold ${sidebarTab === "markups" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}>Markups ({markups.length})</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebarTab === "tasks" ? (
                <div>
                  <div className="p-2">
                    <Button variant="primary" onClick={() => setTool("pin")} className="w-full text-xs">
                      + Add Task to Plan
                    </Button>
                  </div>
                  {tasks.length === 0 ? (
                    <p className="px-3 py-8 text-center text-xs text-gray-400">No tasks pinned to this plan</p>
                  ) : tasks.map(t => (
                    <div key={t.id} onClick={() => setSelectedTask(t)}
                      className={`cursor-pointer border-b border-gray-50 px-3 py-2.5 transition-colors hover:bg-blue-50/50 ${selectedTask?.id === t.id ? "bg-blue-50" : ""}`}>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[t.status] || "#6b7280" }} />
                        <span className="text-xs text-gray-400">{t.task_number}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-900 line-clamp-1">{t.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <PriorityBadge priority={t.priority} />
                        {t.assigned_to && <span className="text-xs text-gray-400">{team.find(m => m.id === t.assigned_to)?.name?.split(" ").map(n => n[0]).join("") || ""}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {markups.length === 0 ? (
                    <p className="px-3 py-8 text-center text-xs text-gray-400">No markups yet. Use the toolbar below.</p>
                  ) : markups.map(m => (
                    <div key={m.id} className="flex items-center justify-between border-b border-gray-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded" style={{ backgroundColor: m.color }} />
                        <span className="text-sm capitalize text-gray-700">{m.type}</span>
                        {m.text && <span className="text-xs text-gray-400">- {m.text}</span>}
                      </div>
                      <button onClick={() => setMarkups(markups.filter(mk => mk.id !== m.id))} className="text-gray-400 hover:text-red-500">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="relative flex-1 overflow-hidden" ref={canvasRef}
          onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          style={{ cursor: tool === "pin" ? "crosshair" : tool !== "select" ? "crosshair" : isPanning ? "grabbing" : "grab" }}>
          {/* Grid Background */}
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

          {/* Plan Surface */}
          <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "0 0", transition: isPanning ? "none" : "transform 0.1s ease" }}>
            {/* Simulated Plan Drawing */}
            <div className="relative" style={{ width: 1200, height: 900 }}>
              <div className="absolute inset-0 rounded border-2 border-gray-300 bg-white shadow-lg">
                {/* Blueprint grid */}
                <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e7ff" strokeWidth="0.5" />
                    </pattern>
                    <pattern id="gridLg" width="200" height="200" patternUnits="userSpaceOnUse">
                      <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#c7d2fe" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  <rect width="100%" height="100%" fill="url(#gridLg)" />
                  {/* Simulated floor plan elements */}
                  <rect x="100" y="100" width="400" height="300" fill="none" stroke="#4f46e5" strokeWidth="2" />
                  <rect x="550" y="100" width="300" height="300" fill="none" stroke="#4f46e5" strokeWidth="2" />
                  <rect x="100" y="450" width="750" height="250" fill="none" stroke="#4f46e5" strokeWidth="2" />
                  <rect x="900" y="100" width="200" height="600" fill="none" stroke="#4f46e5" strokeWidth="2" />
                  <line x1="100" y1="250" x2="500" y2="250" stroke="#4f46e5" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="300" y1="100" x2="300" y2="400" stroke="#4f46e5" strokeWidth="1" strokeDasharray="5,5" />
                  <text x="200" y="200" fill="#6366f1" fontSize="14" fontFamily="sans-serif">Room A-101</text>
                  <text x="650" y="200" fill="#6366f1" fontSize="14" fontFamily="sans-serif">Room A-102</text>
                  <text x="350" y="560" fill="#6366f1" fontSize="14" fontFamily="sans-serif">Common Area</text>
                  <text x="950" y="400" fill="#6366f1" fontSize="14" fontFamily="sans-serif">Corridor</text>
                  {/* Title block */}
                  <rect x="850" y="750" width="340" height="140" fill="#f8fafc" stroke="#4f46e5" strokeWidth="1.5" />
                  <text x="870" y="790" fill="#1e1b4b" fontSize="16" fontWeight="bold" fontFamily="sans-serif">{plan.name}</text>
                  <text x="870" y="815" fill="#6366f1" fontSize="12" fontFamily="sans-serif">Sheet: {plan.sheet_number || "—"} | Rev: {plan.version}</text>
                  <text x="870" y="840" fill="#6366f1" fontSize="12" fontFamily="sans-serif">{plan.job_title || ""}</text>
                  <line x1="850" y1="855" x2="1190" y2="855" stroke="#c7d2fe" strokeWidth="0.5" />
                  <text x="870" y="875" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">FieldPro Drawing Viewer</text>
                </svg>
              </div>

              {/* Task Pins */}
              {tasks.filter(t => t.pin_x != null && t.pin_y != null).map((t, i) => (
                <div key={t.id} onClick={(e) => { e.stopPropagation(); setSelectedTask(t); }}
                  className="group absolute cursor-pointer" style={{ left: t.pin_x - 14, top: t.pin_y - 32 }}>
                  <div className="relative">
                    <svg width="28" height="36" viewBox="0 0 28 36">
                      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill={STATUS_COLORS[t.status] || "#6b7280"} />
                      <text x="14" y="18" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="sans-serif">{i + 1}</text>
                    </svg>
                    <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {t.task_number}: {t.title}
                    </div>
                  </div>
                </div>
              ))}

              {/* Markups */}
              {markups.map(m => (
                <div key={m.id} className="absolute" style={{ left: m.x, top: m.y }}>
                  {m.type === "text" && <span className="rounded px-1 text-sm font-medium" style={{ color: m.color }}>{m.text}</span>}
                  {m.type === "arrow" && <svg width="60" height="20"><line x1="0" y1="10" x2="50" y2="10" stroke={m.color} strokeWidth="2" /><polygon points="50,4 60,10 50,16" fill={m.color} /></svg>}
                  {m.type === "cloud" && <div className="rounded-full border-2 px-4 py-2 text-xs" style={{ borderColor: m.color, color: m.color }}>Note</div>}
                  {m.type === "rect" && <div className="border-2" style={{ width: m.w || 120, height: m.h || 80, borderColor: m.color }} />}
                  {m.type === "measure" && <div className="flex items-center gap-1"><div className="h-0 w-24 border-t-2 border-dashed" style={{ borderColor: m.color }} /><span className="text-xs font-medium" style={{ color: m.color }}>3.2m</span></div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Task Detail */}
        {selectedTask && (
          <div className="w-80 overflow-y-auto border-l bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">{selectedTask.task_number}</span>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{selectedTask.title}</h3>
            {selectedTask.description && <p className="mt-2 text-sm text-gray-600">{selectedTask.description}</p>}

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Status</label>
                <div className="mt-1 flex gap-1.5">
                  {["open", "in_progress", "completed"].map(s => (
                    <button key={s} onClick={() => updateTaskStatus(selectedTask.id, s)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${selectedTask.status === s ? "ring-2 ring-offset-1" : "opacity-60 hover:opacity-100"}`}
                      style={{ backgroundColor: STATUS_COLORS[s] + "20", color: STATUS_COLORS[s], outlineColor: STATUS_COLORS[s] }}>
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Priority</label>
                <div className="mt-1"><PriorityBadge priority={selectedTask.priority} /></div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Assigned To</label>
                <p className="mt-1 text-sm text-gray-900">{team.find(m => m.id === selectedTask.assigned_to)?.name || "Unassigned"}</p>
              </div>
              {selectedTask.due_date && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Due Date</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedTask.due_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
            <div className="mt-6">
              <Button variant="secondary" onClick={() => router.push(`/tasks/${selectedTask.id}`)} className="w-full text-xs">View Full Task</Button>
            </div>
          </div>
        )}
      </div>

      {/* Markup Toolbar */}
      <div className="flex items-center justify-center gap-1 border-t bg-white px-4 py-2">
        {tools.map(t => (
          <button key={t.key} onClick={() => setTool(t.key)} title={t.label}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${tool === t.key ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:bg-gray-100"}`}>
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
          </button>
        ))}
        <div className="mx-2 h-6 w-px bg-gray-200" />
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full border-2 transition-all ${color === c ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"}`}
            style={{ backgroundColor: c }} />
        ))}
        <div className="mx-2 h-6 w-px bg-gray-200" />
        <button onClick={() => setMarkups(markups.slice(0, -1))} className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100" title="Undo">Undo</button>
        <button onClick={() => setMarkups([])} className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50" title="Clear All">Clear</button>
      </div>

      {/* New Task Modal */}
      <Modal isOpen={showTaskModal} onClose={() => { setShowTaskModal(false); setNewPin(null); }} title="Pin Task to Plan"
        footer={<><Button variant="secondary" onClick={() => { setShowTaskModal(false); setNewPin(null); }}>Cancel</Button><Button onClick={createTask} disabled={!taskForm.title.trim()}>Create & Pin</Button></>}>
        <div className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-gray-700">Title *</label><input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
          <div><label className="mb-1 block text-sm font-medium text-gray-700">Description</label><textarea value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Priority</label><select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Assigned To</label><select value={taskForm.assigned_to} onChange={e => setTaskForm({...taskForm, assigned_to: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"><option value="">Unassigned</option>{team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          </div>
          <div><label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label><input type="date" value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
        </div>
      </Modal>
    </div>
  );
}
