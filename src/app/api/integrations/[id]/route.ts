import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const integration = db.prepare(
      `SELECT * FROM integration_settings WHERE id = ?`
    ).get(id) as Record<string, unknown> | undefined;

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const logs = db.prepare(
      `SELECT * FROM integration_log WHERE provider = ? ORDER BY created_at DESC LIMIT 5`
    ).all(integration.provider as string);

    return NextResponse.json({
      ...integration,
      recent_logs: logs,
    });
  } catch (error) {
    console.error("Error fetching integration:", error);
    return NextResponse.json(
      { error: "Failed to fetch integration" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();

    const existing = db.prepare(
      `SELECT * FROM integration_settings WHERE id = ?`
    ).get(id) as Record<string, unknown> | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const fields = [
      "is_enabled",
      "api_url",
      "api_key",
      "api_secret",
      "username",
      "password",
      "extra_config",
      "sync_status",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Log enable/disable toggle
    if (
      "is_enabled" in body &&
      body.is_enabled !== existing.is_enabled
    ) {
      const action = body.is_enabled ? "enabled" : "disabled";
      db.prepare(`
        INSERT INTO integration_log (id, provider, action, status, details)
        VALUES (?, ?, ?, 'success', ?)
      `).run(
        crypto.randomUUID(),
        existing.provider as string,
        action,
        `Integration ${action} by user`
      );
    }

    updates.push(`updated_at = datetime('now')`);
    values.push(id);

    db.prepare(
      `UPDATE integration_settings SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values);

    const updated = db.prepare(
      `SELECT * FROM integration_settings WHERE id = ?`
    ).get(id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json(
      { error: "Failed to update integration" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare(
      `SELECT * FROM integration_settings WHERE id = ?`
    ).get(id);

    if (!existing) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    db.prepare(`DELETE FROM integration_settings WHERE id = ?`).run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json(
      { error: "Failed to delete integration" },
      { status: 500 }
    );
  }
}
