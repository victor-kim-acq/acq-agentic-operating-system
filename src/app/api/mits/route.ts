import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quarter = searchParams.get("quarter");
    const year = searchParams.get("year");

    let result;
    if (quarter && year) {
      result = await sql`
        SELECT id, title, owner_id, quarter, year, status, problem_statement, hypothesis, sort_order, created_at
        FROM mits
        WHERE quarter = ${parseInt(quarter)} AND year = ${parseInt(year)}
        ORDER BY sort_order, created_at
      `;
    } else {
      result = await sql`
        SELECT id, title, owner_id, quarter, year, status, problem_statement, hypothesis, sort_order, created_at
        FROM mits
        ORDER BY year DESC, quarter DESC, sort_order, created_at
      `;
    }

    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch MITs:", error);
    return NextResponse.json(
      { error: "Failed to fetch MITs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, title, owner_id, quarter, year, status, problem_statement, hypothesis, sort_order } =
      await req.json();

    const result = await sql`
      INSERT INTO mits (id, title, owner_id, quarter, year, status, problem_statement, hypothesis, sort_order)
      VALUES (${id}, ${title}, ${owner_id ?? null}, ${quarter ?? null}, ${year ?? null}, ${status ?? null}, ${problem_statement ?? null}, ${hypothesis ?? null}, ${sort_order ?? null})
      RETURNING id, title, owner_id, quarter, year, status, problem_statement, hypothesis, sort_order, created_at
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create MIT:", error);
    return NextResponse.json(
      { error: "Failed to create MIT" },
      { status: 500 }
    );
  }
}
