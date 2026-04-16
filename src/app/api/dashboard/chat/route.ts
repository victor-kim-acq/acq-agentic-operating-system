import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSchemaContext } from "@/lib/schema-context";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

function buildSystemPrompt(schemaContext: string): string {
  return `You are a SQL assistant for ACQ Vantage's Neon Postgres database. Generate a single read-only SELECT query to answer the user's question.

## Schema (loaded from pg_catalog comments)

${schemaContext}

## Query guidance

### Key values
- memberships.status: 'Active', 'Cancellation', 'Payment Failed', 'Re-Subscribed', 'Refund', 'Upsell', 'Downgrade'
- memberships.billing_source: 'Recharge', 'Skool', 'ACE' (stored as these display names)
- memberships.tier: 'Standard', 'Premium', 'VIP', 'VIP (Yearly)', 'Premium + Scale Workshop'
- memberships.membership_type: 'Paying Member' (use this filter for revenue queries)
- memberships.billing_date is stored as TEXT (not TIMESTAMPTZ) — cast with ::date for date comparisons
- deals.close_date is TIMESTAMPTZ — use AT TIME ZONE 'America/Los_Angeles' for date ops

### MRR normalization (ALWAYS use for revenue calculations)
Non-USD or NULL currency memberships use tier-based normalization:
- Standard = 1000, VIP = 3000, VIP (Yearly) = 36000, Premium = 8000, Premium + Scale Workshop = 8000

The full CASE expression:
CASE WHEN LOWER(currency) = 'usd' THEN mrr ELSE CASE WHEN tier = 'Standard' THEN 1000 WHEN tier = 'VIP' THEN 3000 WHEN tier = 'VIP (Yearly)' THEN 36000 WHEN tier = 'Premium' THEN 8000 WHEN tier = 'Premium + Scale Workshop' THEN 8000 ELSE 0 END END

### Rules
- ONLY generate SELECT queries. Never INSERT, UPDATE, DELETE, DROP, ALTER, or any DDL/DML.
- Return ONLY the SQL query, nothing else. No markdown, no backticks, no explanation.
- Keep queries efficient — use appropriate WHERE filters and LIMIT when the user asks for examples or samples.
- For date-based queries referencing "this month" or "current month", use: billing_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Los_Angeles'))::date
- For questions about revenue, always use the MRR normalization CASE and filter on membership_type = 'Paying Member'.
- For "billing source" display context: 'ACE' in the DB corresponds to Stripe payments in business language.`;
}

export async function POST(req: NextRequest) {
  let generatedSql: string | undefined;
  try {
    const { question, history: rawHistory } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const history: Array<{ question: string; answer: string | null }> =
      Array.isArray(rawHistory) ? rawHistory : [];

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Load schema context from pg_catalog comments
    const schemaContext = await getSchemaContext();
    const systemPrompt = buildSystemPrompt(schemaContext);

    // Step 1: Ask Claude to generate SQL
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...history.flatMap((h) => [
            { role: "user", content: h.question },
            {
              role: "assistant",
              content: "Understood. [answered with SQL query]",
            },
          ]),
          { role: "user", content: question },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", errText);
      return NextResponse.json(
        { error: "AI query generation failed" },
        { status: 502 }
      );
    }

    const anthropicData = await anthropicRes.json();
    generatedSql = anthropicData.content?.[0]?.text?.trim();

    if (!generatedSql) {
      return NextResponse.json(
        { error: "No SQL generated" },
        { status: 500 }
      );
    }

    // Safety check: reject anything that's not a SELECT
    const stripped = generatedSql
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/'[^']*'/g, "")
      .trim();
    const upper = stripped.toUpperCase();

    if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
      return NextResponse.json(
        { error: "Only SELECT queries are allowed", sql: generatedSql },
        { status: 400 }
      );
    }

    const forbidden = [
      "INSERT",
      "UPDATE",
      "DELETE",
      "DROP",
      "ALTER",
      "TRUNCATE",
      "CREATE",
      "GRANT",
      "REVOKE",
    ];
    for (const keyword of forbidden) {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(stripped)) {
        return NextResponse.json(
          { error: `Forbidden keyword: ${keyword}`, sql: generatedSql },
          { status: 400 }
        );
      }
    }

    // Step 2: Execute the SQL against Neon
    const result = await sql.query(generatedSql);

    // Step 3: Ask Claude to summarize the results
    const summaryRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [
          ...history.flatMap((h) => [
            { role: "user", content: h.question },
            {
              role: "assistant",
              content: h.answer ?? "(no summary available)",
            },
          ]),
          {
            role: "user",
            content: `The user asked: "${question}"\n\nThe SQL query returned ${result.rows.length} rows:\n${JSON.stringify(result.rows.slice(0, 20), null, 2)}\n\nGive ONE sentence (max two if genuinely needed) with the key insight — the pattern, outlier, or takeaway. Do NOT restate row values the user can see in the table. Do NOT hedge with phrases like "it's worth noting" or "this suggests." Be direct. Use dollar formatting ($XX,XXX) only for aggregates not shown in the table. If empty, say "No results."`,
          },
        ],
      }),
    });

    const summaryData = await summaryRes.json();
    const summary =
      summaryData.content?.[0]?.text ?? "No summary available.";

    return NextResponse.json(
      {
        sql: generatedSql,
        rows: result.rows.slice(0, 100),
        row_count: result.rows.length,
        summary,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const pgError = error as { code?: string };
    if (pgError.code) {
      console.error("Dashboard chat SQL error:", { sql: generatedSql, error });
      return NextResponse.json(
        {
          error: `Query execution failed: ${errMsg}`,
          sql: generatedSql,
        },
        { status: 400 }
      );
    }
    console.error("Dashboard chat error:", error);
    return NextResponse.json(
      { error: `Internal server error: ${errMsg}` },
      { status: 500 }
    );
  }
}
