import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let query = `SELECT * FROM schedule_events WHERE 1=1`;
    const params: unknown[] = [];

    if (user_id) {
      query += ` AND user_id = ?`;
      params.push(user_id);
    }

    if (start) {
      query += ` AND end_time >= ?`;
      params.push(start);
    }

    if (end) {
      query += ` AND start_time <= ?`;
      params.push(end);
    }

    query += ` ORDER BY start_time ASC`;

    const events = db.prepare(query).all(...params);
    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching schedule events:", error);
    return NextResponse.json({ error: "Failed to fetch schedule events" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO schedule_events (id, job_id, task_id, user_id, title, description,
        start_time, end_time, all_day, event_type, status, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.job_id ?? null, body.task_id ?? null, body.user_id ?? null,
      body.title, body.description ?? null,
      body.start_time, body.end_time,
      body.all_day ? 1 : 0, body.event_type ?? "job",
      body.status ?? "scheduled", body.color ?? null
    );

    const event = db.prepare("SELECT * FROM schedule_events WHERE id = ?").get(id);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule event:", error);
    return NextResponse.json({ error: "Failed to create schedule event" }, { status: 500 });
  }
}
