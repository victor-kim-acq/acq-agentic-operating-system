import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await sql`
      SELECT id, name, role, reports_to, created_at FROM users ORDER BY created_at
    `;
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, name, role, reports_to } = await req.json();

    const result = await sql`
      INSERT INTO users (id, name, role, reports_to)
      VALUES (${id}, ${name}, ${role ?? null}, ${reports_to ?? null})
      RETURNING id, name, role, reports_to, created_at
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
