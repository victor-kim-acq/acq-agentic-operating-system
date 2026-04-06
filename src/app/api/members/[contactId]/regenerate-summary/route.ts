import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { sql } from "@/lib/db";

export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';

const HS_BASE = "https://api.hubapi.com";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await params;
  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  // Look up contact email to find Skool member
  const contactRes = await fetch(
    `${HS_BASE}/crm/v3/objects/contacts/${contactId}?properties=email,hs_additional_emails`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  const contactData = await contactRes.json();
  const props = contactData.properties ?? {};

  const primaryEmail = (props.email ?? "").toLowerCase().trim();
  const additionalEmails = (props.hs_additional_emails ?? "")
    .split(";")
    .map((e: string) => e.toLowerCase().trim())
    .filter(Boolean);
  const allEmails = [...new Set([primaryEmail, ...additionalEmails])].filter(Boolean);

  if (allEmails.length === 0) {
    return NextResponse.json({ error: "No email found" }, { status: 400 });
  }

  const emailArrayLiteral = `{${allEmails.join(",")}}`;
  const memberResult = await sql`
    SELECT user_id FROM skool_members
    WHERE LOWER(email) = ANY(${emailArrayLiteral}::text[])
    LIMIT 1
  `;

  if (memberResult.rows.length === 0) {
    return NextResponse.json({ error: "Skool member not found" }, { status: 404 });
  }

  const userId = memberResult.rows[0].user_id;
  await sql`
    UPDATE skool_members
    SET ai_summary = NULL, summary_generated_at = NULL
    WHERE user_id = ${userId}
  `;

  return NextResponse.json({ success: true });
}
