import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { id, name, category, description, position_x, position_y, metadata } =
      await req.json();

    const result =
      await sql`INSERT INTO business_processes (id, name, category, description, position_x, position_y, metadata)
        VALUES (${id}, ${name}, ${category}, ${description}, ${position_x}, ${position_y}, CAST(${JSON.stringify(metadata || {})} AS jsonb))
        RETURNING id, name, category, description, position_x, position_y, metadata`;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create process:", error);
    return NextResponse.json(
      { error: "Failed to create process" },
      { status: 500 }
    );
  }
}
