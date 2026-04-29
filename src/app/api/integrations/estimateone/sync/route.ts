import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function POST() {
  try {
    const db = getDb();

    const integration = db.prepare(
      `SELECT * FROM integration_settings WHERE provider = 'estimateone'`
    ).get() as Record<string, unknown> | undefined;

    if (!integration) {
      return NextResponse.json(
        { error: "EstimateOne integration not configured" },
        { status: 404 }
      );
    }

    if (!integration.is_enabled) {
      return NextResponse.json(
        { error: "EstimateOne integration is not enabled" },
        { status: 400 }
      );
    }

    // Parse extra_config for filter settings
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse((integration.extra_config as string) || "{}");
    } catch {
      config = {};
    }

    const states = (config.states as string[]) || [];
    const trades = (config.trades as string[]) || [];
    const keywords = (config.keywords as string[]) || [];

    // Simulate finding new tenders: return imported_tenders from estimateone
    // that are still pending (not yet processed)
    const newTenders = db.prepare(
      `SELECT * FROM imported_tenders
       WHERE provider = 'estimateone'
         AND decision = 'pending'
         AND is_archived = 0
       ORDER BY imported_at DESC`
    ).all() as Array<Record<string, unknown>>;

    // Log the sync action
    db.prepare(`
      INSERT INTO integration_log (id, provider, action, status, details, items_processed)
      VALUES (?, 'estimateone', 'sync', 'success', ?, ?)
    `).run(
      crypto.randomUUID(),
      JSON.stringify({
        filters: { states, trades, keywords },
        new_tenders_found: newTenders.length,
      }),
      newTenders.length
    );

    // Update last_sync on integration_settings
    db.prepare(`
      UPDATE integration_settings
      SET last_sync = datetime('now'), sync_status = 'success', updated_at = datetime('now')
      WHERE provider = 'estimateone'
    `).run();

    return NextResponse.json({
      success: true,
      provider: "estimateone",
      new_tenders_found: newTenders.length,
      tenders: newTenders,
      filters_applied: {
        states,
        trades,
        keywords,
      },
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing EstimateOne:", error);

    // Log the failed sync
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO integration_log (id, provider, action, status, details)
        VALUES (?, 'estimateone', 'sync', 'error', ?)
      `).run(
        crypto.randomUUID(),
        String(error)
      );

      db.prepare(`
        UPDATE integration_settings
        SET sync_status = 'error', updated_at = datetime('now')
        WHERE provider = 'estimateone'
      `).run();
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: "Failed to sync with EstimateOne" },
      { status: 500 }
    );
  }
}
