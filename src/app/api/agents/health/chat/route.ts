import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

const HEALTH_SKILL_PATH = ".claude/skills/member-health/SKILL.md";
const RETENTION_SKILL_PATH = ".claude/skills/acq-vantage-retention/SKILL.md";

function loadFile(relPath: string): string {
  try {
    return readFileSync(join(process.cwd(), relPath), "utf8");
  } catch (err) {
    console.error(`Failed to load ${relPath}:`, err);
    return "";
  }
}

function buildSystemPrompt(cohortJson: unknown): string {
  const healthSkill = loadFile(HEALTH_SKILL_PATH);
  const retentionSkill = loadFile(RETENTION_SKILL_PATH);
  const cohortStr = JSON.stringify(cohortJson, null, 2);

  return `You are the ACQ Vantage Member Health Agent. You answer questions about the current member-health snapshot — what the composite score means, which bands members fall into, which segments are at risk, and how cohorts compare.

When asked how a metric is defined, use the exact definition from the skill — do not paraphrase. Formula weights and band thresholds are precise by design.

## Member health framework (from ${HEALTH_SKILL_PATH})

${healthSkill}

## Underlying retention framework (from ${RETENTION_SKILL_PATH}) — for context on why signals matter

${retentionSkill}

## Live filtered snapshot (current page state)

The following JSON is the live response from the health endpoints for the currently-applied filter state. Compute answers directly from it when possible.

\`\`\`json
${cohortStr}
\`\`\`

## Scope

In scope: composite score formula, band definitions, at-risk segments, cohort comparisons, champion analysis, how any health metric is computed.

Out of scope — redirect:
- Cohort churn rates over time → "See /agents/retention for churn-over-time breakdowns."
- AI activation cohort analysis (2+ days, first 7 days) → "See /agents/activation for the full cohort-over-time activation view."
- Revenue, deals, billing ops, subscription ops → "That's outside my scope."

## Standards

- Always surface the math. "16 champions / 802 active = 2.0%" — not "about 2%".
- When quoting a count, cite the filter state so numbers are reproducible.
- Flag n<5 cells as directional only.
- When a result is counterintuitive, explain why proactively.
- Keep answers concise — 1–3 short paragraphs. Use a small markdown table only when a comparison genuinely needs one.
- Do not preface with "Great question" or similar — answer directly.
- If you're uncertain, say so — don't fabricate.`;
}

interface ChatRequestBody {
  question?: string;
  history?: Array<{ question: string; answer: string | null }>;
  cohort?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { question, history: rawHistory, cohort } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }
    if (!cohort) {
      return NextResponse.json(
        { error: "Health data is required" },
        { status: 400 }
      );
    }

    const history = Array.isArray(rawHistory) ? rawHistory : [];

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemPrompt(cohort);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...history.flatMap((h) => [
            { role: "user", content: h.question },
            {
              role: "assistant",
              content: h.answer ?? "(no answer available)",
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
        { error: "AI response failed" },
        { status: 502 }
      );
    }

    const data = await anthropicRes.json();
    const answer = data.content?.[0]?.text?.trim() ?? "No answer available.";

    return NextResponse.json(
      { answer },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Health chat error:", error);
    return NextResponse.json(
      { error: `Internal server error: ${errMsg}` },
      { status: 500 }
    );
  }
}
