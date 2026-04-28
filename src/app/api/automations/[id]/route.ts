import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const rule = db.prepare(`SELECT * FROM automation_rules WHERE id = ?`).get(id);
    if (!rule) {
      return NextResponse.json({ error: "Automation rule not found" }, { status: 404 });
    }

    const logs = db.prepare(
      `SELECT * FROM automation_log WHERE rule_id = ? ORDER BY created_at DESC LIMIT 20`
    ).all(id);

    return NextResponse.json({
      ...(rule as Record<string, unknown>),
      logs,
    });
  } catch (error) {
    console.error("Error fetching automation rule:", error);
    return NextResponse.json({ error: "Failed to fetch automation rule" }, { status: 500 });
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

    const existing = db.prepare(`SELECT * FROM automation_rules WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Automation rule not found" }, { status: 404 });
    }

    const fields = [
      "name", "description", "trigger_type", "action_type", "is_active", "created_by",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // Handle JSON object fields
    if ("trigger_config" in body) {
      updates.push(`trigger_config = ?`);
      values.push(
        typeof body.trigger_config === "object"
          ? JSON.stringify(body.trigger_config)
          : body.trigger_config
      );
    }

    if ("action_config" in body) {
      updates.push(`action_config = ?`);
      values.push(
        typeof body.action_config === "object"
          ? JSON.stringify(body.action_config)
          : body.action_config
      );
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`updated_at = datetime('now')`);
    values.push(id);
    db.prepare(`UPDATE automation_rules SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const rule = db.prepare(`SELECT * FROM automation_rules WHERE id = ?`).get(id);
    return NextResponse.json(rule);
  } catch (error) {
    console.error("Error updating automation rule:", error);
    return NextResponse.json({ error: "Failed to update automation rule" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare(`SELECT * FROM automation_rules WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Automation rule not found" }, { status: 404 });
    }

    db.prepare(`DELETE FROM automation_rules WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation rule:", error);
    return NextResponse.json({ error: "Failed to delete automation rule" }, { status: 500 });
  }
}
