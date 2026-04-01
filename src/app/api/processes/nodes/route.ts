import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { id, name, category, description, position_x, position_y } =
      await req.json();

    const result =
      await sql`INSERT INTO business_processes (id, name, category, description, position_x, position_y)
        VALUES (${id}, ${name}, ${category}, ${description}, ${position_x}, ${position_y})
        RETURNING id, name, category, description, position_x, position_y`;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create process:", error);
    return NextResponse.json(
      { error: "Failed to create process" },
      { status: 500 }
    );
  }
}
