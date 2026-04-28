import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");
    const is_read = searchParams.get("is_read");
    const type = searchParams.get("type");

    let query = `SELECT * FROM alerts WHERE 1=1`;
    const params: unknown[] = [];

    if (user_id) {
      query += ` AND user_id = ?`;
      params.push(user_id);
    }

    if (is_read !== null && is_read !== undefined && is_read !== "") {
      query += ` AND is_read = ?`;
      params.push(parseInt(is_read, 10));
    }

    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC`;

    const alerts = db.prepare(query).all(...params);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO alerts (id, user_id, title, message, type, entity_type, entity_id, is_read, action_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.user_id || null,
      body.title,
      body.message || null,
      body.type || "info",
      body.entity_type || null,
      body.entity_id || null,
      body.is_read || 0,
      body.action_url || null
    );

    const alert = db.prepare(`SELECT * FROM alerts WHERE id = ?`).get(id);
    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
