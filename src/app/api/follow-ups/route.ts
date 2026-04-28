import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const entity_type = searchParams.get("entity_type");
    const entity_id = searchParams.get("entity_id");
    const status = searchParams.get("status");
    const assigned_to = searchParams.get("assigned_to");

    let query = `
      SELECT f.*, u.name AS assigned_to_name
      FROM follow_ups f
      LEFT JOIN users u ON f.assigned_to = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (entity_type) {
      query += ` AND f.entity_type = ?`;
      params.push(entity_type);
    }

    if (entity_id) {
      query += ` AND f.entity_id = ?`;
      params.push(entity_id);
    }

    if (status) {
      if (status === "overdue") {
        query += ` AND f.status = 'pending' AND f.due_date < datetime('now')`;
      } else {
        query += ` AND f.status = ?`;
        params.push(status);
      }
    }

    if (assigned_to) {
      query += ` AND f.assigned_to = ?`;
      params.push(assigned_to);
    }

    query += ` ORDER BY f.due_date ASC`;

    const followUps = db.prepare(query).all(...params);
    return NextResponse.json(followUps);
  } catch (error) {
    console.error("Error fetching follow-ups:", error);
    return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.entity_type || !body.entity_id || !body.title || !body.due_date) {
      return NextResponse.json(
        { error: "entity_type, entity_id, title, and due_date are required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO follow_ups (id, entity_type, entity_id, title, description, due_date, completed_date, status, priority, assigned_to, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.entity_type,
      body.entity_id,
      body.title,
      body.description || null,
      body.due_date,
      body.completed_date || null,
      body.status || "pending",
      body.priority || "medium",
      body.assigned_to || null,
      body.created_by || null
    );

    const followUp = db.prepare(`
      SELECT f.*, u.name AS assigned_to_name
      FROM follow_ups f
      LEFT JOIN users u ON f.assigned_to = u.id
      WHERE f.id = ?
    `).get(id);

    return NextResponse.json(followUp, { status: 201 });
  } catch (error) {
    console.error("Error creating follow-up:", error);
    return NextResponse.json({ error: "Failed to create follow-up" }, { status: 500 });
  }
}
