import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  try {
    const db = getDb();
    const users = db.prepare(
      "SELECT id, email, name, role, phone, avatar_url, hourly_rate, is_active, created_at, updated_at FROM users ORDER BY name ASC"
    ).all();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO users (id, email, name, role, phone, avatar_url, hourly_rate, is_active, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.email, body.name, body.role ?? "field_tech",
      body.phone ?? null, body.avatar_url ?? null,
      body.hourly_rate ?? 0, body.is_active ?? 1,
      body.password_hash ?? ""
    );

    const user = db.prepare(
      "SELECT id, email, name, role, phone, avatar_url, hourly_rate, is_active, created_at, updated_at FROM users WHERE id = ?"
    ).get(id);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
