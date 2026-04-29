import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    let digest: Record<string, unknown> | undefined;

    if (date) {
      digest = db.prepare(
        `SELECT * FROM morning_digest WHERE digest_date = ? ORDER BY created_at DESC LIMIT 1`
      ).get(date) as Record<string, unknown> | undefined;
    } else {
      digest = db.prepare(
        `SELECT * FROM morning_digest ORDER BY created_at DESC LIMIT 1`
      ).get() as Record<string, unknown> | undefined;
    }

    if (!digest) {
      return NextResponse.json(
        { error: "No digest found" },
        { status: 404 }
      );
    }

    // Include pending imported tenders (decision='pending', state='VIC')
    const pendingTenders = db.prepare(
      `SELECT * FROM imported_tenders
       WHERE decision = 'pending'
         AND state = 'VIC'
         AND is_archived = 0
       ORDER BY estimated_value DESC`
    ).all();

    return NextResponse.json({
      ...digest,
      pending_tenders: pendingTenders,
    });
  } catch (error) {
    console.error("Error fetching morning digest:", error);
    return NextResponse.json(
      { error: "Failed to fetch morning digest" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const db = getDb();

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Count imported_tenders from today/yesterday that are state='VIC' and trade like '%Electrical%'
    const newTenders = db.prepare(
      `SELECT * FROM imported_tenders
       WHERE state = 'VIC'
         AND trade LIKE '%Electrical%'
         AND is_archived = 0
         AND (date(imported_at) = ? OR date(imported_at) = ?)
       ORDER BY estimated_value DESC`
    ).all(today, yesterday) as Array<Record<string, unknown>>;

    const totalNew = newTenders.length;

    // Count all VIC tenders from today/yesterday
    const totalVic = (db.prepare(
      `SELECT COUNT(*) as count FROM imported_tenders
       WHERE state = 'VIC'
         AND is_archived = 0
         AND (date(imported_at) = ? OR date(imported_at) = ?)`
    ).get(today, yesterday) as { count: number }).count;

    // Count pending decisions
    const pendingDecisions = (db.prepare(
      `SELECT COUNT(*) as count FROM imported_tenders
       WHERE decision = 'pending'
         AND is_archived = 0`
    ).get() as { count: number }).count;

    // Build a summary string highlighting top tenders by value
    const topTenders = newTenders.slice(0, 3);
    let summary = `Good morning! ${totalNew} new electrical tenders in VIC today.`;

    if (topTenders.length > 0) {
      const highlights = topTenders.map((t) => {
        const value = t.estimated_value
          ? `$${(Number(t.estimated_value) / 1000).toFixed(0)}K`
          : "TBD";
        const closing = t.closing_date
          ? `, closes ${new Date(t.closing_date as string).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}`
          : "";
        return `${t.title} (${value}${closing})`;
      });
      summary += ` Highlights: ${highlights.join(", ")}.`;
    }

    summary += ` ${pendingDecisions} tenders awaiting your quote/no-quote decision.`;

    // Insert into morning_digest table
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO morning_digest (
        id, digest_date, total_new, total_vic, total_electrical,
        pending_decisions, summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      today,
      totalNew,
      totalVic,
      totalNew,
      pendingDecisions,
      summary
    );

    const digest = db.prepare(
      `SELECT * FROM morning_digest WHERE id = ?`
    ).get(id);

    // Include pending VIC tenders in the response
    const pendingTenders = db.prepare(
      `SELECT * FROM imported_tenders
       WHERE decision = 'pending'
         AND state = 'VIC'
         AND is_archived = 0
       ORDER BY estimated_value DESC`
    ).all();

    return NextResponse.json(
      {
        ...(digest as Record<string, unknown>),
        pending_tenders: pendingTenders,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error generating morning digest:", error);
    return NextResponse.json(
      { error: "Failed to generate morning digest" },
      { status: 500 }
    );
  }
}
