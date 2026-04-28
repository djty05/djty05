import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: string;
  action_type: string;
  action_config: string;
  is_active: number;
  run_count: number;
}

interface TriggerResult {
  rule_id: string;
  rule_name: string;
  trigger_type: string;
  action_type: string;
  entities_affected: number;
  details: string[];
}

export async function POST() {
  try {
    const db = getDb();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);
    const today = now.substring(0, 10);

    const rules = db.prepare(
      `SELECT * FROM automation_rules WHERE is_active = 1`
    ).all() as AutomationRule[];

    const results: TriggerResult[] = [];

    for (const rule of rules) {
      const triggerConfig = JSON.parse(rule.trigger_config || "{}");
      const actionConfig = JSON.parse(rule.action_config || "{}");
      const result: TriggerResult = {
        rule_id: rule.id,
        rule_name: rule.name,
        trigger_type: rule.trigger_type,
        action_type: rule.action_type,
        entities_affected: 0,
        details: [],
      };

      try {
        switch (rule.trigger_type) {
          case "tender_deadline_approaching": {
            const daysBefore = triggerConfig.days_before || 7;
            const tenders = db.prepare(`
              SELECT t.*, c.company_name AS client_name
              FROM tenders t
              LEFT JOIN clients c ON t.client_id = c.id
              WHERE t.submission_deadline IS NOT NULL
                AND t.status NOT IN ('won', 'lost', 'submitted')
                AND date(t.submission_deadline) >= date(?)
                AND date(t.submission_deadline) <= date(?, '+' || ? || ' days')
            `).all(today, today, daysBefore) as Record<string, unknown>[];

            for (const tender of tenders) {
              const alertId = crypto.randomUUID();
              const message = actionConfig.message || `Tender deadline approaching`;
              db.prepare(`
                INSERT INTO alerts (id, user_id, title, message, type, entity_type, entity_id, is_read, action_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
              `).run(
                alertId,
                tender.assigned_to || null,
                `${tender.tender_number}: ${message}`,
                `${tender.title} - submission due ${tender.submission_deadline}`,
                actionConfig.type || "warning",
                "tender",
                tender.id,
                `/tenders/${tender.id}`
              );

              db.prepare(`
                INSERT INTO automation_log (id, rule_id, trigger_type, action_type, entity_type, entity_id, details, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
              `).run(
                crypto.randomUUID(),
                rule.id,
                rule.trigger_type,
                rule.action_type,
                "tender",
                tender.id as string,
                `Alert created for tender ${tender.tender_number} - deadline ${tender.submission_deadline}`
              );

              result.entities_affected++;
              result.details.push(`Alert created for ${tender.tender_number}`);
            }
            break;
          }

          case "tender_checklist_incomplete": {
            const daysBefore = triggerConfig.days_before || 3;
            const tenders = db.prepare(`
              SELECT DISTINCT t.*, c.company_name AS client_name,
                (SELECT COUNT(*) FROM tender_checklist tc WHERE tc.tender_id = t.id AND tc.is_complete = 0) AS incomplete_count
              FROM tenders t
              LEFT JOIN clients c ON t.client_id = c.id
              INNER JOIN tender_checklist tc ON tc.tender_id = t.id AND tc.is_complete = 0
              WHERE t.submission_deadline IS NOT NULL
                AND t.status NOT IN ('won', 'lost', 'submitted')
                AND date(t.submission_deadline) >= date(?)
                AND date(t.submission_deadline) <= date(?, '+' || ? || ' days')
            `).all(today, today, daysBefore) as Record<string, unknown>[];

            for (const tender of tenders) {
              const alertId = crypto.randomUUID();
              const message = actionConfig.message || `Tender has incomplete checklist items`;
              db.prepare(`
                INSERT INTO alerts (id, user_id, title, message, type, entity_type, entity_id, is_read, action_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
              `).run(
                alertId,
                tender.assigned_to || null,
                `${tender.tender_number}: ${message}`,
                `${tender.title} - ${tender.incomplete_count} incomplete items, deadline ${tender.submission_deadline}`,
                actionConfig.type || "urgent",
                "tender",
                tender.id,
                `/tenders/${tender.id}`
              );

              db.prepare(`
                INSERT INTO automation_log (id, rule_id, trigger_type, action_type, entity_type, entity_id, details, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
              `).run(
                crypto.randomUUID(),
                rule.id,
                rule.trigger_type,
                rule.action_type,
                "tender",
                tender.id as string,
                `Alert created for tender ${tender.tender_number} - ${tender.incomplete_count} incomplete checklist items`
              );

              result.entities_affected++;
              result.details.push(`Alert created for ${tender.tender_number} (${tender.incomplete_count} incomplete items)`);
            }
            break;
          }

          case "quote_no_response": {
            const daysAfterSent = triggerConfig.days_after_sent || 3;
            const quotes = db.prepare(`
              SELECT q.*, c.company_name AS client_name
              FROM quotes q
              LEFT JOIN clients c ON q.client_id = c.id
              WHERE q.status = 'sent'
                AND date(q.updated_at) <= date(?, '-' || ? || ' days')
            `).all(today, daysAfterSent) as Record<string, unknown>[];

            for (const quote of quotes) {
              const followUpId = crypto.randomUUID();
              const title = actionConfig.title || "Follow up on sent quote";
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 1);
              const dueDateStr = dueDate.toISOString().substring(0, 10);

              db.prepare(`
                INSERT INTO follow_ups (id, entity_type, entity_id, title, description, due_date, status, priority, assigned_to, created_by)
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
              `).run(
                followUpId,
                "quote",
                quote.id,
                `${title} - ${quote.quote_number}`,
                `Quote ${quote.quote_number} (${quote.title}) sent to ${quote.client_name || "client"} with no response for ${daysAfterSent}+ days`,
                dueDateStr,
                actionConfig.priority || "high",
                quote.created_by || null,
                quote.created_by || null
              );

              db.prepare(`
                INSERT INTO automation_log (id, rule_id, trigger_type, action_type, entity_type, entity_id, details, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
              `).run(
                crypto.randomUUID(),
                rule.id,
                rule.trigger_type,
                rule.action_type,
                "quote",
                quote.id as string,
                `Follow-up created for quote ${quote.quote_number} - no response for ${daysAfterSent}+ days`
              );

              result.entities_affected++;
              result.details.push(`Follow-up created for ${quote.quote_number}`);
            }
            break;
          }

          case "invoice_overdue": {
            const invoices = db.prepare(`
              SELECT i.*, c.company_name AS client_name
              FROM invoices i
              LEFT JOIN clients c ON i.client_id = c.id
              WHERE i.status = 'sent'
                AND i.due_date IS NOT NULL
                AND date(i.due_date) < date(?)
            `).all(today) as Record<string, unknown>[];

            for (const invoice of invoices) {
              const alertId = crypto.randomUUID();
              const message = actionConfig.message || "Invoice is overdue";
              db.prepare(`
                INSERT INTO alerts (id, user_id, title, message, type, entity_type, entity_id, is_read, action_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
              `).run(
                alertId,
                invoice.created_by || null,
                `${invoice.invoice_number}: ${message}`,
                `${invoice.title} - due ${invoice.due_date}, total $${invoice.total}`,
                actionConfig.type || "warning",
                "invoice",
                invoice.id,
                `/invoices/${invoice.id}`
              );

              db.prepare(`
                INSERT INTO automation_log (id, rule_id, trigger_type, action_type, entity_type, entity_id, details, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
              `).run(
                crypto.randomUUID(),
                rule.id,
                rule.trigger_type,
                rule.action_type,
                "invoice",
                invoice.id as string,
                `Alert created for overdue invoice ${invoice.invoice_number} - due ${invoice.due_date}`
              );

              result.entities_affected++;
              result.details.push(`Alert created for ${invoice.invoice_number}`);
            }
            break;
          }

          case "site_visit_approaching": {
            const daysBefore = triggerConfig.days_before || 1;
            const tenders = db.prepare(`
              SELECT t.*, c.company_name AS client_name
              FROM tenders t
              LEFT JOIN clients c ON t.client_id = c.id
              WHERE t.site_visit_date IS NOT NULL
                AND t.status NOT IN ('won', 'lost')
                AND date(t.site_visit_date) >= date(?)
                AND date(t.site_visit_date) <= date(?, '+' || ? || ' days')
            `).all(today, today, daysBefore) as Record<string, unknown>[];

            for (const tender of tenders) {
              const alertId = crypto.randomUUID();
              const message = actionConfig.message || "Site visit approaching";
              db.prepare(`
                INSERT INTO alerts (id, user_id, title, message, type, entity_type, entity_id, is_read, action_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
              `).run(
                alertId,
                tender.assigned_to || null,
                `${tender.tender_number}: ${message}`,
                `${tender.title} - site visit ${tender.site_visit_date} at ${tender.site_address || "TBD"}`,
                actionConfig.type || "info",
                "tender",
                tender.id,
                `/tenders/${tender.id}`
              );

              db.prepare(`
                INSERT INTO automation_log (id, rule_id, trigger_type, action_type, entity_type, entity_id, details, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
              `).run(
                crypto.randomUUID(),
                rule.id,
                rule.trigger_type,
                rule.action_type,
                "tender",
                tender.id as string,
                `Alert created for site visit on ${tender.site_visit_date} - ${tender.tender_number}`
              );

              result.entities_affected++;
              result.details.push(`Alert created for ${tender.tender_number} site visit`);
            }
            break;
          }

          case "job_completed": {
            const daysAfter = triggerConfig.days_after || 3;
            const jobs = db.prepare(`
              SELECT j.*, c.company_name AS client_name
              FROM jobs j
              LEFT JOIN clients c ON j.client_id = c.id
              WHERE j.status = 'completed'
                AND j.completed_date IS NOT NULL
                AND date(j.completed_date) = date(?, '-' || ? || ' days')
            `).all(today, daysAfter) as Record<string, unknown>[];

            for (const job of jobs) {
              const followUpId = crypto.randomUUID();
              const title = actionConfig.title || "Client satisfaction check";
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 1);
              const dueDateStr = dueDate.toISOString().substring(0, 10);

              db.prepare(`
                INSERT INTO follow_ups (id, entity_type, entity_id, title, description, due_date, status, priority, assigned_to, created_by)
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
              `).run(
                followUpId,
                "job",
                job.id,
                `${title} - ${job.job_number}`,
                `Job ${job.job_number} (${job.title}) for ${job.client_name || "client"} was completed ${daysAfter} days ago`,
                dueDateStr,
                actionConfig.priority || "medium",
                job.assigned_to || null,
                job.assigned_to || null
              );

              db.prepare(`
                INSERT INTO automation_log (id, rule_id, trigger_type, action_type, entity_type, entity_id, details, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
              `).run(
                crypto.randomUUID(),
                rule.id,
                rule.trigger_type,
                rule.action_type,
                "job",
                job.id as string,
                `Follow-up created for completed job ${job.job_number} - completed ${daysAfter} days ago`
              );

              result.entities_affected++;
              result.details.push(`Follow-up created for ${job.job_number}`);
            }
            break;
          }

          case "tender_won": {
            const tenders = db.prepare(`
              SELECT t.*, c.company_name AS client_name
              FROM tenders t
              LEFT JOIN clients c ON t.client_id = c.id
              WHERE t.status = 'won'
                AND (t.job_id IS NULL OR t.job_id = '')
            `).all() as Record<string, unknown>[];

            for (const tender of tenders) {
              const alertId = crypto.randomUUID();
              const message = actionConfig.message || "Tender won! Create a job to begin work.";
              db.prepare(`
                INSERT INTO alerts (id, user_id, title, message, type, entity_type, entity_id, is_read, action_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
              `).run(
                alertId,
                tender.assigned_to || tender.created_by || null,
                `${tender.tender_number}: ${message}`,
                `${tender.title} (${tender.client_name || "client"}) - estimated value $${tender.estimated_value}`,
                actionConfig.type || "success",
                "tender",
                tender.id,
                `/tenders/${tender.id}`
              );

              db.prepare(`
                INSERT INTO automation_log (id, rule_id, trigger_type, action_type, entity_type, entity_id, details, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
              `).run(
                crypto.randomUUID(),
                rule.id,
                rule.trigger_type,
                rule.action_type,
                "tender",
                tender.id as string,
                `Alert created for won tender ${tender.tender_number} - no job linked yet`
              );

              result.entities_affected++;
              result.details.push(`Alert created for won tender ${tender.tender_number}`);
            }
            break;
          }
        }
      } catch (ruleError) {
        console.error(`Error processing rule ${rule.id}:`, ruleError);
        db.prepare(`
          INSERT INTO automation_log (id, rule_id, trigger_type, action_type, details, status)
          VALUES (?, ?, ?, ?, ?, 'error')
        `).run(
          crypto.randomUUID(),
          rule.id,
          rule.trigger_type,
          rule.action_type,
          `Error: ${ruleError instanceof Error ? ruleError.message : String(ruleError)}`
        );
        result.details.push(`Error: ${ruleError instanceof Error ? ruleError.message : String(ruleError)}`);
      }

      // Update last_run and run_count on the rule
      db.prepare(`
        UPDATE automation_rules
        SET last_run = datetime('now'), run_count = run_count + 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(rule.id);

      if (result.entities_affected > 0 || result.details.length > 0) {
        results.push(result);
      }
    }

    return NextResponse.json({
      success: true,
      rules_evaluated: rules.length,
      rules_triggered: results.filter((r) => r.entities_affected > 0).length,
      total_actions: results.reduce((sum, r) => sum + r.entities_affected, 0),
      results,
    });
  } catch (error) {
    console.error("Error running automations:", error);
    return NextResponse.json({ error: "Failed to run automations" }, { status: 500 });
  }
}
