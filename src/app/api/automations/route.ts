import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const is_active = searchParams.get("is_active");

    let query = `SELECT * FROM automation_rules WHERE 1=1`;
    const params: unknown[] = [];

    if (is_active !== null && is_active !== undefined && is_active !== "") {
      query += ` AND is_active = ?`;
      params.push(parseInt(is_active, 10));
    }

    query += ` ORDER BY created_at DESC`;

    const rules = db.prepare(query).all(...params);
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error fetching automation rules:", error);
    return NextResponse.json({ error: "Failed to fetch automation rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.name || !body.trigger_type || !body.action_type) {
      return NextResponse.json(
        { error: "name, trigger_type, and action_type are required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO automation_rules (id, name, description, trigger_type, trigger_config, action_type, action_config, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.name,
      body.description || null,
      body.trigger_type,
      typeof body.trigger_config === "object" ? JSON.stringify(body.trigger_config) : body.trigger_config || "{}",
      body.action_type,
      typeof body.action_config === "object" ? JSON.stringify(body.action_config) : body.action_config || "{}",
      body.is_active ?? 1,
      body.created_by || null
    );

    const rule = db.prepare(`SELECT * FROM automation_rules WHERE id = ?`).get(id);
    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("Error creating automation rule:", error);
    return NextResponse.json({ error: "Failed to create automation rule" }, { status: 500 });
  }
}
