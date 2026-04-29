import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function POST() {
  try {
    const db = getDb();

    const integration = db.prepare(
      `SELECT * FROM integration_settings WHERE provider = 'simpro'`
    ).get() as Record<string, unknown> | undefined;

    if (!integration) {
      return NextResponse.json(
        { error: "Simpro integration not configured" },
        { status: 404 }
      );
    }

    if (!integration.is_enabled) {
      return NextResponse.json(
        { error: "Simpro integration is not enabled" },
        { status: 400 }
      );
    }

    // Parse extra_config for sync settings
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse((integration.extra_config as string) || "{}");
    } catch {
      config = {};
    }

    const syncJobs = config.sync_jobs !== false;
    const syncQuotes = config.sync_quotes !== false;
    const syncInvoices = config.sync_invoices !== false;
    const syncClients = config.sync_clients !== false;

    // Simulate syncing: count local entities not yet in simpro_sync table
    const summary: Record<string, unknown> = {};

    if (syncJobs) {
      const unsyncedJobs = db.prepare(`
        SELECT COUNT(*) as count FROM jobs
        WHERE id NOT IN (SELECT local_id FROM simpro_sync WHERE entity_type = 'job')
      `).get() as { count: number };
      summary.jobs_to_sync = unsyncedJobs.count;
    }

    if (syncQuotes) {
      const unsyncedQuotes = db.prepare(`
        SELECT COUNT(*) as count FROM quotes
        WHERE id NOT IN (SELECT local_id FROM simpro_sync WHERE entity_type = 'quote')
      `).get() as { count: number };
      summary.quotes_to_sync = unsyncedQuotes.count;
    }

    if (syncInvoices) {
      const unsyncedInvoices = db.prepare(`
        SELECT COUNT(*) as count FROM invoices
        WHERE id NOT IN (SELECT local_id FROM simpro_sync WHERE entity_type = 'invoice')
      `).get() as { count: number };
      summary.invoices_to_sync = unsyncedInvoices.count;
    }

    if (syncClients) {
      const unsyncedClients = db.prepare(`
        SELECT COUNT(*) as count FROM clients
        WHERE id NOT IN (SELECT local_id FROM simpro_sync WHERE entity_type = 'client')
      `).get() as { count: number };
      summary.clients_to_sync = unsyncedClients.count;
    }

    // Log the sync action
    db.prepare(`
      INSERT INTO integration_log (id, provider, action, status, details, items_processed)
      VALUES (?, 'simpro', 'sync', 'success', ?, ?)
    `).run(
      crypto.randomUUID(),
      JSON.stringify({
        config: {
          sync_jobs: syncJobs,
          sync_quotes: syncQuotes,
          sync_invoices: syncInvoices,
          sync_clients: syncClients,
        },
        summary,
      }),
      Object.values(summary).reduce((a: number, b) => a + (b as number), 0)
    );

    // Update last_sync on integration_settings
    db.prepare(`
      UPDATE integration_settings
      SET last_sync = datetime('now'), sync_status = 'success', updated_at = datetime('now')
      WHERE provider = 'simpro'
    `).run();

    return NextResponse.json({
      success: true,
      provider: "simpro",
      summary,
      sync_settings: {
        sync_jobs: syncJobs,
        sync_quotes: syncQuotes,
        sync_invoices: syncInvoices,
        sync_clients: syncClients,
      },
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing Simpro:", error);

    // Log the failed sync
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO integration_log (id, provider, action, status, details)
        VALUES (?, 'simpro', 'sync', 'error', ?)
      `).run(
        crypto.randomUUID(),
        String(error)
      );

      db.prepare(`
        UPDATE integration_settings
        SET sync_status = 'error', updated_at = datetime('now')
        WHERE provider = 'simpro'
      `).run();
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: "Failed to sync with Simpro" },
      { status: 500 }
    );
  }
}
