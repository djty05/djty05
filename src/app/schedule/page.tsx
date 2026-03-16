"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";

interface ScheduleEvent {
  id: string;
  title: string;
  job_id: string | null;
  task_id: string | null;
  user_id: string | null;
  start_time: string;
  end_time: string;
  event_type: string;
  color: string | null;
  status: string;
  description: string | null;
  [key: string]: unknown;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  [key: string]: unknown;
}

interface Job {
  id: string;
  title: string;
  job_number: string;
  [key: string]: unknown;
}

interface Task {
  id: string;
  title: string;
  task_number: string;
  job_id: string;
  [key: string]: unknown;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am to 8pm
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EVENT_COLORS: Record<string, string> = {
  job: "bg-blue-500",
  meeting: "bg-purple-500",
  break: "bg-gray-400",
};

const COLOR_OPTIONS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#6b7280", label: "Gray" },
  { value: "#ec4899", label: "Pink" },
  { value: "#14b8a6", label: "Teal" },
];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    job_id: "",
    task_id: "",
    user_id: "",
    start_time: "",
    end_time: "",
    event_type: "job",
    color: "#3b82f6",
    description: "",
  });

  const weekEnd = addDays(weekStart, 6);
  const today = new Date();

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      if (!res.ok) throw new Error("Failed to fetch team");
      const data = await res.json();
      setTeam(data);
    } catch {
      console.error("Error fetching team");
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data);
    } catch {
      console.error("Error fetching jobs");
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startStr = formatDateISO(weekStart);
      const endStr = formatDateISO(addDays(weekStart, 7));
      const res = await fetch(`/api/schedules?start=${startStr}&end=${endStr}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchTeam();
    fetchJobs();
  }, [fetchTeam, fetchJobs]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch tasks filtered by selected job
  useEffect(() => {
    if (!newEvent.job_id) {
      setTasks([]);
      return;
    }
    fetch(`/api/tasks?job_id=${newEvent.job_id}`)
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .catch(() => setTasks([]));
  }, [newEvent.job_id]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredEvents = events.filter((e) => {
    if (selectedMembers.size === 0) return true;
    return e.user_id && selectedMembers.has(e.user_id);
  });

  const getEventsForDayHour = (date: Date, hour: number) => {
    return filteredEvents.filter((e) => {
      const start = new Date(e.start_time);
      const end = new Date(e.end_time);
      if (!isSameDay(start, date) && !isSameDay(end, date)) {
        if (date < start || date > end) return false;
      }
      const startHour = isSameDay(start, date) ? start.getHours() : 0;
      const endHour = isSameDay(end, date) ? end.getHours() : 24;
      return hour >= startHour && hour < endHour;
    });
  };

  const getEventPosition = (event: ScheduleEvent, date: Date) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startHour = isSameDay(start, date)
      ? start.getHours() + start.getMinutes() / 60
      : 6;
    const endHour = isSameDay(end, date)
      ? end.getHours() + end.getMinutes() / 60
      : 20;
    const top = ((startHour - 6) / 14) * 100;
    const height = ((endHour - startHour) / 14) * 100;
    return { top: `${top}%`, height: `${Math.max(height, 100 / 14)}%` };
  };

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter((e) => {
      const start = new Date(e.start_time);
      const end = new Date(e.end_time);
      return (
        isSameDay(start, date) ||
        isSameDay(end, date) ||
        (date >= start && date <= end)
      );
    });
  };

  const getEventColor = (event: ScheduleEvent) => {
    if (event.color) return event.color;
    const type = event.event_type || "job";
    const map: Record<string, string> = {
      job: "#3b82f6",
      meeting: "#8b5cf6",
      break: "#6b7280",
    };
    return map[type] || "#3b82f6";
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "";
    const member = team.find((m) => m.id === userId);
    return member ? member.name : "";
  };

  const handleSlotClick = (date: Date, hour: number) => {
    const startDate = new Date(date);
    startDate.setHours(hour, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(hour + 1, 0, 0, 0);

    const toLocalISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${day}T${h}:${min}`;
    };

    setNewEvent({
      title: "",
      job_id: "",
      task_id: "",
      user_id: "",
      start_time: toLocalISO(startDate),
      end_time: toLocalISO(endDate),
      event_type: "job",
      color: "#3b82f6",
      description: "",
    });
    setShowNewEvent(true);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.start_time || !newEvent.end_time) return;
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvent.title,
          job_id: newEvent.job_id || null,
          task_id: newEvent.task_id || null,
          user_id: newEvent.user_id || null,
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          event_type: newEvent.event_type,
          color: newEvent.color,
          description: newEvent.description || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create event");
      setShowNewEvent(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const goToday = () => setWeekStart(getMonday(new Date()));
  const goPrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const goNextWeek = () => setWeekStart(addDays(weekStart, 7));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your team&apos;s weekly schedule
          </p>
        </div>
        <Button variant="primary" onClick={() => {
          setNewEvent({
            title: "",
            job_id: "",
            task_id: "",
            user_id: "",
            start_time: "",
            end_time: "",
            event_type: "job",
            color: "#3b82f6",
            description: "",
          });
          setShowNewEvent(true);
        }}>
          Add Event
        </Button>
      </div>

      {/* Week Navigation */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <Button variant="ghost" size="sm" onClick={goPrevWeek}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Button>
        <Button variant="secondary" size="sm" onClick={goToday}>
          Today
        </Button>
        <Button variant="ghost" size="sm" onClick={goNextWeek}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Button>
        <span className="text-sm font-semibold text-gray-900">
          {formatDateShort(weekStart)} &ndash; {formatDateShort(weekEnd)},{" "}
          {weekEnd.getFullYear()}
        </span>
      </div>

      {/* Team Member Filter */}
      {team.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <span className="mr-2 text-sm font-medium text-gray-700">Team:</span>
          {team.map((member) => {
            const active = selectedMembers.has(member.id);
            return (
              <button
                key={member.id}
                onClick={() => toggleMember(member.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {member.name}
              </button>
            );
          })}
          {selectedMembers.size > 0 && (
            <button
              onClick={() => setSelectedMembers(new Set())}
              className="ml-2 text-xs text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Day Headers */}
            <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-gray-200">
              <div className="border-r border-gray-200 bg-gray-50 p-2" />
              {weekDates.map((date, i) => {
                const isToday = isSameDay(date, today);
                return (
                  <div
                    key={i}
                    className={`border-r border-gray-200 p-2 text-center last:border-r-0 ${
                      isToday ? "bg-blue-50" : "bg-gray-50"
                    }`}
                  >
                    <div className={`text-xs font-medium ${isToday ? "text-blue-700" : "text-gray-500"}`}>
                      {DAYS[i]}
                    </div>
                    <div
                      className={`mt-0.5 text-sm font-semibold ${
                        isToday
                          ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white"
                          : "text-gray-900"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Grid with Events */}
            <div className="relative grid grid-cols-[70px_repeat(7,1fr)]">
              {/* Time labels column */}
              <div className="border-r border-gray-200">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="flex h-14 items-start justify-end border-b border-gray-100 pr-2 pt-0.5"
                  >
                    <span className="text-xs text-gray-400">{formatHour(hour)}</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDates.map((date, dayIdx) => {
                const isToday = isSameDay(date, today);
                const dayEvents = getEventsForDay(date);

                return (
                  <div
                    key={dayIdx}
                    className={`relative border-r border-gray-200 last:border-r-0 ${
                      isToday ? "bg-blue-50/30" : ""
                    }`}
                  >
                    {/* Hour slots */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="h-14 cursor-pointer border-b border-gray-100 hover:bg-gray-50/50"
                        onClick={() => handleSlotClick(date, hour)}
                      />
                    ))}

                    {/* Events overlay */}
                    {dayEvents.map((event) => {
                      const pos = getEventPosition(event, date);
                      const color = getEventColor(event);
                      return (
                        <div
                          key={event.id}
                          className="absolute left-0.5 right-0.5 cursor-pointer overflow-hidden rounded px-1.5 py-0.5 text-xs text-white shadow-sm transition-opacity hover:opacity-90"
                          style={{
                            top: pos.top,
                            height: pos.height,
                            backgroundColor: color,
                            minHeight: "20px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                        >
                          <div className="truncate font-medium">{event.title}</div>
                          <div className="truncate opacity-80">
                            {getUserName(event.user_id)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* New Event Modal */}
      <Modal
        isOpen={showNewEvent}
        onClose={() => setShowNewEvent(false)}
        title="New Event"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowNewEvent(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateEvent}
              disabled={!newEvent.title || !newEvent.start_time || !newEvent.end_time}
            >
              Create Event
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Event title"
            />
          </div>

          <Select
            label="Job"
            value={newEvent.job_id}
            onChange={(v) => setNewEvent({ ...newEvent, job_id: v, task_id: "" })}
            options={[
              { value: "", label: "Select a job" },
              ...jobs.map((j) => ({ value: j.id, label: `${j.job_number} - ${j.title}` })),
            ]}
          />

          {newEvent.job_id && (
            <Select
              label="Task"
              value={newEvent.task_id}
              onChange={(v) => setNewEvent({ ...newEvent, task_id: v })}
              options={[
                { value: "", label: "Select a task" },
                ...tasks.map((t) => ({
                  value: t.id,
                  label: `${t.task_number} - ${t.title}`,
                })),
              ]}
            />
          )}

          <Select
            label="Team Member"
            value={newEvent.user_id}
            onChange={(v) => setNewEvent({ ...newEvent, user_id: v })}
            options={[
              { value: "", label: "Select a team member" },
              ...team.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start Date/Time
              </label>
              <input
                type="datetime-local"
                value={newEvent.start_time}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, start_time: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                End Date/Time
              </label>
              <input
                type="datetime-local"
                value={newEvent.end_time}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, end_time: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <Select
            label="Type"
            value={newEvent.event_type}
            onChange={(v) => setNewEvent({ ...newEvent, event_type: v })}
            options={[
              { value: "job", label: "Job" },
              { value: "meeting", label: "Meeting" },
              { value: "break", label: "Break" },
            ]}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewEvent({ ...newEvent, color: c.value })}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    newEvent.color === c.value
                      ? "border-gray-900 scale-110"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Event Detail Popup */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || "Event Details"}
      >
        {selectedEvent && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: getEventColor(selectedEvent) }}
              />
              <span className="text-sm font-medium capitalize text-gray-600">
                {selectedEvent.event_type}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Start</span>
                <span>
                  {new Date(selectedEvent.start_time).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">End</span>
                <span>
                  {new Date(selectedEvent.end_time).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              {selectedEvent.user_id && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Assigned To</span>
                  <span>{getUserName(selectedEvent.user_id)}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div>
                  <span className="font-medium text-gray-500">Description</span>
                  <p className="mt-1 text-gray-700">{selectedEvent.description}</p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Status</span>
                <span className="capitalize">{selectedEvent.status}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
