import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  try {
    const db = getDb();

    const integrations = db.prepare(
      `SELECT * FROM integration_settings ORDER BY provider ASC`
    ).all() as Array<Record<string, unknown>>;

    const result = integrations.map((integration) => {
      const logs = db.prepare(
        `SELECT * FROM integration_log WHERE provider = ? ORDER BY created_at DESC LIMIT 5`
      ).all(integration.provider as string);

      return {
        ...integration,
        recent_logs: logs,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    const existing = db.prepare(
      `SELECT * FROM integration_settings WHERE provider = ?`
    ).get(body.provider) as Record<string, unknown> | undefined;

    if (existing) {
      const fields = [
        "is_enabled",
        "api_url",
        "api_key",
        "api_secret",
        "username",
        "password",
        "extra_config",
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

      updates.push(`updated_at = datetime('now')`);
      values.push(existing.id);

      db.prepare(
        `UPDATE integration_settings SET ${updates.join(", ")} WHERE id = ?`
      ).run(...values);

      const updated = db.prepare(
        `SELECT * FROM integration_settings WHERE id = ?`
      ).get(existing.id);

      return NextResponse.json(updated);
    } else {
      const id = crypto.randomUUID();

      db.prepare(`
        INSERT INTO integration_settings (
          id, provider, is_enabled, api_url, api_key, api_secret,
          username, password, extra_config
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.provider,
        body.is_enabled ?? 0,
        body.api_url || null,
        body.api_key || null,
        body.api_secret || null,
        body.username || null,
        body.password || null,
        body.extra_config || "{}"
      );

      const integration = db.prepare(
        `SELECT * FROM integration_settings WHERE id = ?`
      ).get(id);

      return NextResponse.json(integration, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating/updating integration:", error);
    return NextResponse.json(
      { error: "Failed to create/update integration" },
      { status: 500 }
    );
  }
}
