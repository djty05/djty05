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

    const quote = db.prepare(`
      SELECT q.*, c.company_name AS client_name, c.contact_name AS client_contact,
        c.email AS client_email, c.phone AS client_phone
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.id = ?
    `).get(id);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const items = db.prepare(
      `SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`
    ).all(id);

    return NextResponse.json({ ...(quote as Record<string, unknown>), items });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
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

    const existing = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const fields = [
      "client_id", "job_id", "title", "description", "status",
      "subtotal", "tax_rate", "tax_amount", "total", "valid_until", "notes"
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    const transaction = db.transaction(() => {
      if (updates.length > 0) {
        updates.push(`updated_at = datetime('now')`);
        values.push(id);
        db.prepare(`UPDATE quotes SET ${updates.join(", ")} WHERE id = ?`).run(...values);
      }

      if (Array.isArray(body.items)) {
        db.prepare(`DELETE FROM quote_items WHERE quote_id = ?`).run(id);
        const insertItem = db.prepare(`
          INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, total, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (let i = 0; i < body.items.length; i++) {
          const item = body.items[i];
          insertItem.run(
            item.id || crypto.randomUUID(), id,
            item.description, item.quantity ?? 1,
            item.unit_price ?? 0, item.total ?? 0,
            item.sort_order ?? i
          );
        }
      }
    });

    transaction();

    const quote = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
    const items = db.prepare(`SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`).all(id);
    return NextResponse.json({ ...(quote as Record<string, unknown>), items });
  } catch (error) {
    console.error("Error updating quote:", error);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    db.prepare(`DELETE FROM quotes WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quote:", error);
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
  }
}
