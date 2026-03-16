import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const job_id = searchParams.get("job_id");
    const status = searchParams.get("status");
    const assigned_to = searchParams.get("assigned_to");

    let query = `
      SELECT t.*, j.title AS job_title
      FROM tasks t
      LEFT JOIN jobs j ON t.job_id = j.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (job_id) {
      query += ` AND t.job_id = ?`;
      params.push(job_id);
    }

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (assigned_to) {
      query += ` AND t.assigned_to = ?`;
      params.push(assigned_to);
    }

    query += ` ORDER BY t.created_at DESC`;

    const tasks = db.prepare(query).all(...params);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    const maxRow = db.prepare(
      `SELECT task_number FROM tasks ORDER BY CAST(SUBSTR(task_number, 5) AS INTEGER) DESC LIMIT 1`
    ).get() as { task_number: string } | undefined;

    const nextNum = maxRow ? parseInt(maxRow.task_number.split("-")[1], 10) + 1 : 1;
    const task_number = `TSK-${String(nextNum).padStart(3, "0")}`;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO tasks (id, task_number, job_id, title, description, status, priority,
        category, assigned_to, plan_id, pin_x, pin_y, due_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, task_number,
      body.job_id || null, body.title, body.description || null,
      body.status || "open", body.priority || "medium",
      body.category || "general", body.assigned_to || null,
      body.plan_id || null, body.pin_x ?? null, body.pin_y ?? null,
      body.due_date || null, body.created_by || null
    );

    const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
