import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

const SKILL_PATH = ".claude/skills/acq-vantage-retention/SKILL.md";
const BASELINE_PATH =
  ".claude/skills/acq-vantage-retention/references/march-2026-baseline.md";

function loadFile(relPath: string): string {
  try {
    return readFileSync(join(process.cwd(), relPath), "utf8");
  } catch (err) {
    console.error(`Failed to load ${relPath}:`, err);
    return "";
  }
}

function buildSystemPrompt(cohortJson: unknown): string {
  const skill = loadFile(SKILL_PATH);
  const baseline = loadFile(BASELINE_PATH);
  const cohortStr = JSON.stringify(cohortJson, null, 2);

  return `You are the ACQ Vantage Retention Agent. You answer questions about the March 2026 member retention and activation cohort.

## Framework (from .claude/skills/acq-vantage-retention/SKILL.md)

${skill}

## Baseline reference (from .claude/skills/acq-vantage-retention/references/march-2026-baseline.md)

${baseline}

## Live cohort data (current query result)

The following JSON is the live response from /api/agents/retention/cohort. Use it to answer specific questions about numbers, segments, and breakdowns. When the user asks about a specific metric, compute the answer directly from this data and show the math.

\`\`\`json
${cohortStr}
\`\`\`

## Scope

Only answer questions about this cohort and the retention/activation framework. If asked about revenue, deals, or anything outside retention, respond exactly:

"That's outside my scope — the Dashboard page has a data analyst agent that can help with that."

## Standards

- Always surface the math behind any number you cite (e.g. "14/76 = 18.4%")
- When a number seems counterintuitive, explain why proactively (e.g. "Skool-native ai_and_community churns at 23.1% — same as neither. Signals don't predict churn for Skool-native members; see the Skool playbook gap note.")
- Flag any cell or claim where n<5 as directional only
- If you're uncertain, say so — don't fabricate
- Keep answers concise. Default to 1-3 short paragraphs. Use a small markdown table only when a comparison genuinely needs one.
- Do not include a preamble like "Great question" — answer directly.`;
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
        { error: "Cohort data is required" },
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
        model: "claude-sonnet-4-20250514",
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
    const answer =
      data.content?.[0]?.text?.trim() ?? "No answer available.";

    return NextResponse.json(
      { answer },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Retention chat error:", error);
    return NextResponse.json(
      { error: `Internal server error: ${errMsg}` },
      { status: 500 }
    );
  }
}
