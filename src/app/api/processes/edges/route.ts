import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { id, source_id, target_id, label } = await req.json();

    const result =
      await sql`INSERT INTO process_connections (id, source_id, target_id, label)
        VALUES (${id}, ${source_id}, ${target_id}, ${label})
        RETURNING id, source_id, target_id, label`;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create connection:", error);
    return NextResponse.json(
      { error: "Failed to create connection" },
      { status: 500 }
    );
  }
}
