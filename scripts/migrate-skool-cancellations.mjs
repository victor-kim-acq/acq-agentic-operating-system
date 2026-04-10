import { sql } from "@vercel/postgres";

async function migrate() {
  console.log("Running Skool cancellations migration...");

  await sql`
    CREATE TABLE IF NOT EXISTS skool_cancellations (
      skool_user_id        TEXT PRIMARY KEY,
      first_name           TEXT,
      last_name            TEXT,
      email                TEXT,
      skool_profile        TEXT,
      bio                  TEXT,
      location             TEXT,
      request_location     TEXT,
      role                 TEXT,
      approved_at          TIMESTAMPTZ,
      churned_at           TIMESTAMPTZ,
      billing_canceled_at  TIMESTAMPTZ,
      cancelled_at         TIMESTAMPTZ,
      last_offline         TIMESTAMPTZ,
      stripe_sub_id        TEXT,
      billing_currency     TEXT,
      billing_amount_cents INTEGER,
      billing_interval     TEXT,
      billing_tier         TEXT,
      lifetime_value_cents BIGINT,
      attribution          TEXT,
      attribution_source   TEXT,
      affiliate_user_id    TEXT,
      affiliate_pct        NUMERIC,
      cancellation_type    TEXT,
      points               INTEGER DEFAULT 0,
      level                INTEGER DEFAULT 0,
      survey_q1            TEXT,
      survey_a1            TEXT,
      survey_q2            TEXT,
      survey_a2            TEXT,
      survey_q3            TEXT,
      survey_a3            TEXT,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  Created skool_cancellations table");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_skool_cancellations_email ON skool_cancellations(email)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_skool_cancellations_cancelled_at ON skool_cancellations(cancelled_at)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_skool_cancellations_cancellation_type ON skool_cancellations(cancellation_type)
  `;
  console.log("  Created indexes on skool_cancellations");

  console.log("Skool cancellations migration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
